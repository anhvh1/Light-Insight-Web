import { useMapAlarmStream } from './MapAlarmStreamProvider';

export function useMapAlarmSignalR() {
  return useMapAlarmStream();
}
