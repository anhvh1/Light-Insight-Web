import { useAlarmStream } from './AlarmStreamProvider';

export function useAlarmSignalR() {
  return useAlarmStream();
}
