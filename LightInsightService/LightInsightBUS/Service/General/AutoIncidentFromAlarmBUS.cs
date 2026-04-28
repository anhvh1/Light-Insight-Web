using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using Microsoft.Extensions.Logging;

namespace LightInsightBUS.Service.General
{
    public class AutoIncidentFromAlarmBUS : IAutoIncidentFromAlarm
    {
        private sealed class TriggerRoute
        {
            public Guid SopId { get; init; }
            public Guid ConnectorId { get; init; }
        }

        private static readonly TimeSpan TriggerCacheTtl = TimeSpan.FromSeconds(60);
        private static readonly TimeSpan DedupTtl = TimeSpan.FromHours(1);

        private readonly SopDAL _sopDAL;
        private readonly IIncident _incidentBUS;
        private readonly GetAnalyticsEvents _analyticsEvents;
        private readonly ILogger<AutoIncidentFromAlarmBUS> _logger;
        private readonly SemaphoreSlim _refreshLock = new SemaphoreSlim(1, 1);

        // Key: "{CameraId}|{AlarmDefinitionName}" — so sánh OrdinalIgnoreCase
        private readonly ConcurrentDictionary<string, TriggerRoute> _triggerLookup = new ConcurrentDictionary<string, TriggerRoute>(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, DateTime> _processedAlarmIds = new ConcurrentDictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
        private DateTime _lastRefreshUtc = DateTime.MinValue;

        public AutoIncidentFromAlarmBUS(
            IIncident incidentBUS,
            GetAnalyticsEvents analyticsEvents,
            ILogger<AutoIncidentFromAlarmBUS> logger)
        {
            _sopDAL = new SopDAL();
            _incidentBUS = incidentBUS;
            _analyticsEvents = analyticsEvents;
            _logger = logger;
        }

        public async Task TryCreateFromAlarmAsync(MilestoneAlarmPayload payload, CancellationToken cancellationToken = default)
        {
            if (payload == null) return;

            var alarmId = (payload.alarmId ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(alarmId))
            {
                return;
            }

            CleanupProcessedAlarms();

            if (_processedAlarmIds.TryGetValue(alarmId, out var seenAtUtc) &&
                DateTime.UtcNow - seenAtUtc < DedupTtl)
            {
                return;
            }

            await EnsureTriggerCacheAsync(cancellationToken);

            // So sánh CameraId từ socket với CameraId trong trigger
            var cameraId = (payload.cameraid ?? string.Empty).Trim();
            // So sánh Message từ socket (event_name) với alarm definition name trong trigger
            var eventName = (payload.message ?? string.Empty).Trim();

            if (string.IsNullOrEmpty(cameraId) || string.IsNullOrEmpty(eventName))
            {
                _logger.LogDebug(
                    "Auto-incident skip: cameraId or message is empty for alarm {AlarmId}, cameraId={CameraId}, message={Message}",
                    alarmId, cameraId, eventName);
                return;
            }

            var key = BuildLookupKey(cameraId, eventName);

            _logger.LogInformation(
                "[AUTO-INCIDENT COMPARE] AlarmId={AlarmId} | LookupKey={Key} | CameraId={CameraId} | Message={Message} | CacheCount={CacheCount}",
                alarmId, key, cameraId, eventName, _triggerLookup.Count);

            if (!_triggerLookup.TryGetValue(key, out var route))
            {
                _logger.LogDebug(
                    "Auto-incident skip: no trigger match for alarm {AlarmId} camera={CameraId} message={Message}",
                    alarmId, cameraId, eventName);
                return;
            }

            var model = new IncidentCreateModel
            {
                Priority = string.IsNullOrWhiteSpace(payload.priorityName)
                    ? null
                    : payload.priorityName!.Trim().ToUpperInvariant(),
                SourceId = (payload.source ?? payload.location ?? string.Empty).Trim(),
                Status = null,
                VmsId = route.ConnectorId,
                AlarmTime = ParseAlarmTime(payload.time),
                Description = payload.message?.Trim() ?? payload.alarmName?.Trim(),
                UserId = null,
                SopId = route.SopId,
            };

            _logger.LogInformation(
                "[AUTO-INCIDENT SAVE] AlarmId={AlarmId} | Priority={Priority} | SourceId={SourceId} | VmsId={VmsId} | AlarmTime={AlarmTime} | Description={Description} | SopId={SopId}",
                alarmId, model.Priority, model.SourceId, model.VmsId, model.AlarmTime, model.Description, model.SopId);

            try
            {
                var createResult = await _incidentBUS.CreateAsync(model);
                if (createResult?.Status == 1)
                {
                    _processedAlarmIds[alarmId] = DateTime.UtcNow;
                    _logger.LogInformation(
                        "Auto-created incident for alarm {AlarmId}, SopId={SopId}, ConnectorId={ConnectorId}",
                        alarmId, route.SopId, route.ConnectorId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Auto-create incident failed for alarm {AlarmId}", alarmId);
            }
        }

        private async Task EnsureTriggerCacheAsync(CancellationToken cancellationToken)
        {
            if (DateTime.UtcNow - _lastRefreshUtc < TriggerCacheTtl && _triggerLookup.Count > 0)
            {
                return;
            }

            await _refreshLock.WaitAsync(cancellationToken);
            try
            {
                if (DateTime.UtcNow - _lastRefreshUtc < TriggerCacheTtl && _triggerLookup.Count > 0)
                {
                    return;
                }

                var triggerRows = await _sopDAL.GetAllTriggersAsync();
                if (triggerRows.Count == 0)
                {
                    _triggerLookup.Clear();
                    _lastRefreshUtc = DateTime.UtcNow;
                    return;
                }

                // Lấy danh sách alarm definition name theo từng connector
                var eventsByConnector = new Dictionary<Guid, Dictionary<Guid, string>>();
                foreach (var connectorId in triggerRows.Select(x => x.ConnectorId).Distinct())
                {
                    var events = await _analyticsEvents.GetSimpleEventsAsync(connectorId);
                    var map = new Dictionary<Guid, string>();
                    foreach (var item in events)
                    {
                        if (Guid.TryParse(item.ID, out var eventId) && !string.IsNullOrWhiteSpace(item.Name))
                        {
                            map[eventId] = item.Name.Trim();
                        }
                    }

                    eventsByConnector[connectorId] = map;
                }

                _triggerLookup.Clear();
                foreach (var trigger in triggerRows)
                {
                    if (!eventsByConnector.TryGetValue(trigger.ConnectorId, out var connectorEvents))
                    {
                        continue;
                    }
                    if (!connectorEvents.TryGetValue(trigger.EventId, out var eventName))
                    {
                        continue;
                    }

                    // Key giữ nguyên case — dictionary dùng OrdinalIgnoreCase
                    var key = BuildLookupKey(trigger.CameraId.ToString(), eventName);
                    _triggerLookup[key] = new TriggerRoute
                    {
                        SopId = trigger.SopId,
                        ConnectorId = trigger.ConnectorId,
                    };
                }

                _logger.LogInformation("Trigger cache refreshed: {Count} entries", _triggerLookup.Count);
                foreach (var entry in _triggerLookup)
                {
                    _logger.LogInformation("[TRIGGER-CACHE] Key={Key} | SopId={SopId} | ConnectorId={ConnectorId}", entry.Key, entry.Value.SopId, entry.Value.ConnectorId);
                }
                _lastRefreshUtc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh SOP trigger cache for auto incident.");
            }
            finally
            {
                _refreshLock.Release();
            }
        }

        private void CleanupProcessedAlarms()
        {
            var threshold = DateTime.UtcNow - DedupTtl;
            foreach (var pair in _processedAlarmIds)
            {
                if (pair.Value < threshold)
                {
                    _processedAlarmIds.TryRemove(pair.Key, out _);
                }
            }
        }

        private static string BuildLookupKey(string cameraId, string eventName)
        {
            return $"{cameraId}|{eventName}";
        }

        private static DateTime? ParseAlarmTime(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;

            var text = raw.Trim();
            if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed))
            {
                return parsed;
            }

            if (DateTime.TryParse(text, out parsed))
            {
                return parsed;
            }

            return null;
        }
    }
}
