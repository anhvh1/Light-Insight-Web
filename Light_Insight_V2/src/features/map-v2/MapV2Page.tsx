import { MapLayoutManagerPanel } from './components/MapLayoutManagerPanel';
import { I18nProvider } from './i18n/I18nProvider';

export default function MapV2Page() {
  return (
    <I18nProvider>
      <MapLayoutManagerPanel />
    </I18nProvider>
  );
}
