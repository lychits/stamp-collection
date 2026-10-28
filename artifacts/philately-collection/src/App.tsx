import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import { Archive, ArrowUpRight, BookOpen, CircleHelp, Coins, Feather, Grid2X2, ImagePlus, Plus, Search, Stamp, X, Pencil, Trash2, Save, RotateCcw } from 'lucide-react';
import { CATALOG_GEOMETRY, CATALOG_RESEARCH, MAX_CATALOG_BYTES, emptyCropIds, findings, marketSource, parseCatalog, serializeCatalog, type Crop, type StampRecord } from './research';
import ValuationSummary from './ValuationSummary';

const images = [1, 2, 3].map(page => `${import.meta.env.BASE_URL}source/album-page-${page}-rectified.jpg`);
const STORE = 'philatelic-archive-v3';
const GEOMETRY_KEY = 'philatelic-archive-rectified-v2';
const RESEARCH_KEY = 'philatelic-archive-research-v1';
const RESEARCH_VERSION = CATALOG_RESEARCH;
const PAGE_GEOMETRY = [
  { width: 3059 / 3.9375, height: 4059 / 3.9375, angle: 0.4755888093 },
  { width: 3072 / 3.9375, height: 4068 / 3.9375, angle: -0.6574178364 },
  { width: 3071 / 3.9375, height: 4068 / 3.9375, angle: -0.6434314116 },
];
function expandCrop(crop: Crop): Crop {
  const padX = crop.width * 0.025;
  return {
    x: crop.x - padX,
    y: crop.y,
    width: crop.width + padX * 2,
    height: crop.height,
  };
}
function rectifyCrop(crop: Crop, pageIndex: number): Crop {
  const page = PAGE_GEOMETRY[pageIndex] ?? PAGE_GEOMETRY[0];
  const expanded = expandCrop(crop);
  const x = expanded.x * 7.68;
  const y = expanded.y * 10.24;
  const width = expanded.width * 7.68;
  const height = expanded.height * 10.24;
  const angle = page.angle * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    [x, y], [x + width, y], [x, y + height], [x + width, y + height],
  ].map(([px, py]) => ({
    x: (px - 384) * cos - (py - 512) * sin + page.width / 2,
    y: (px - 384) * sin + (py - 512) * cos + page.height / 2,
  }));
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    x: minX / page.width * 100,
    y: minY / page.height * 100,
    width: (maxX - minX) / page.width * 100,
    height: (maxY - minY) / page.height * 100,
  };
}
function unrectifyCrop(crop: Crop, pageIndex: number): Crop {
  const page = PAGE_GEOMETRY[pageIndex] ?? PAGE_GEOMETRY[0];
  const angle = page.angle * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    [crop.x * page.width / 100, crop.y * page.height / 100],
    [(crop.x + crop.width) * page.width / 100, crop.y * page.height / 100],
    [crop.x * page.width / 100, (crop.y + crop.height) * page.height / 100],
    [(crop.x + crop.width) * page.width / 100, (crop.y + crop.height) * page.height / 100],
  ].map(([px, py]) => ({
    x: (px - page.width / 2) * cos + (py - page.height / 2) * sin + 384,
    y: -(px - page.width / 2) * sin + (py - page.height / 2) * cos + 512,
  }));
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));
  return {
    x: minX / 768 * 100,
    y: minY / 1024 * 100,
    width: (maxX - minX) / 768 * 100,
    height: (maxY - minY) / 1024 * 100,
  };
}
function removeOldCropMargin(crop: Crop): Crop {
  const padX = 0.025;
  const padY = 0.015;
  return {
    x: crop.x + crop.width * padX / (1 + 2 * padX),
    y: crop.y + crop.height * padY / (1 + 2 * padY),
    width: crop.width / (1 + 2 * padX),
    height: crop.height / (1 + 2 * padY),
  };
}
const rects: number[][][] = [
  [
    [194,2,121,167],[315,13,108,153],[431,12,105,156],[541,16,109,151],[658,16,104,151],
    [29,177,164,111],[202,177,165,111],[375,177,168,111],[589,177,164,112],
    [31,296,163,119],[202,296,164,119],[376,296,166,119],[588,298,163,119],
    [21,470,119,175],[145,470,119,175],[271,470,117,175],[395,470,120,175],[519,470,114,175],[639,470,111,175],
    [17,660,99,151],[119,660,104,151],[227,660,102,151],[333,660,105,151],[440,660,104,151],[563,672,193,154],
    [27,819,149,174],[183,819,106,174],[296,819,126,174],[428,819,126,174],[560,819,190,174]
  ],
  [
    [17,26,101,179],[120,26,104,179],[226,26,103,179],[331,26,129,179],[469,26,113,180],
    [591,29,54,36],[645,29,54,36],[699,29,55,36],[591,65,54,36],[699,65,55,36],
    [591,101,54,38],[645,101,54,38],[699,101,55,38],
    [16,209,164,114],[183,210,161,115],[347,209,168,116],[618,146,128,176],
    [21,359,153,154],[179,333,135,175],[317,355,113,164],[431,360,182,146],
    [21,603,163,155],[188,603,158,155],[349,603,164,155],[521,640,186,114],
    [30,765,96,96],[133,765,105,96],[245,765,108,96],[362,765,103,96],[469,765,105,96],[578,764,174,98],
    [33,869,155,130],[194,869,143,130],[342,869,164,130],[511,869,162,130],
    
  ],
  [
    [0,8,207,159],[210,7,163,159],[378,7,180,159],[563,7,204,159],
    [19,175,153,75],[177,175,150,75],[331,175,147,75],[483,174,164,75],[655,198,108,129],
    [10,362,121,169],[137,362,121,169],[264,362,120,169],[388,362,119,169],[511,362,119,169],[634,362,128,169],[4,548,118,99],[127,548,119,99],[251,548,124,99],[381,548,118,99],[506,548,117,99],[629,548,131,99],
    [23,665,132,94],[160,665,126,94],[292,665,126,94],[423,665,133,94],[562,665,196,94],
    [25,764,131,84],[161,764,126,84],[291,764,130,84],[425,764,132,84],[562,764,192,84],
    [15,877,108,147],[129,877,104,147],[240,877,115,147],[362,877,98,147],[466,877,94,147],[568,877,92,147],[669,877,91,147]
  ]
];
const seedRecords: StampRecord[] = rects.flatMap((page, pi) => page.map((r, i) => {
  const pageOneCountries = [
    'Куба', 'СССР (надпись видна)', 'СССР (надпись видна)', 'СССР (надпись видна)', 'СССР (надпись видна)',
    'Куба', 'Куба', 'Куба', 'СССР (надпись видна)',
    'Куба', 'Куба', 'Куба', 'СССР (надпись видна)',
    'Куба', 'Куба', 'Куба', 'Куба', 'Куба', 'Куба',
    'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам',
    'Куба', 'Куба', 'Куба', 'Куба', 'Куба', 'Куба',
  ];
  const pageTwoCountries = [
    'Никарагуа', 'Никарагуа', 'Никарагуа', 'Никарагуа', 'Намибия',
    'Польша', 'Польша', 'Польша', 'Польша', 'Польша', 'Польша', 'Польша', 'Польша',
    'Никарагуа', 'Никарагуа', 'Никарагуа', 'Венгрия',
    'Не определена', 'Чехословакия', 'Польша', 'СССР (надпись видна)',
    'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам',
    'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам', 'Вьетнам',
    'Вьетнам', 'Австралия', 'Польша', 'Польша',
  ];
  const country = pi === 0 ? pageOneCountries[i] : pi === 1 ? pageTwoCountries[i] : 'СССР (надпись видна)';
  const readableSubjects = pi === 0 ? 'Птицы' : pi === 1 ? 'Птицы' : 'Птицы';
  const id = `album-${pi + 1}-${String(i + 1).padStart(2, '0')}`;
  const finding = findings[id];
  const currency = country.startsWith('СССР') ? 'коп.' : country === 'Никарагуа' ? 'кордоба' : country === 'Намибия' ? '' : country === 'Австралия' ? 'центов' : country === 'Венгрия' ? 'форинтов' : country === 'Польша' ? 'злотых/грошей' : country === 'Вьетнам' ? 'су' : country === 'Куба' ? 'сентаво' : '';
  const date = finding?.series === 'Эндемичные птицы Кубы' ? (finding.year === '1975' ? '18 июня 1975' : '15 июня 1976')
    : finding?.series === 'Птицы Никарагуа' ? '30 ноября 1981'
    : finding?.series === 'Певчие птицы' ? '20 августа 1981'
    : finding?.series === 'Международный орнитологический конгресс' ? '10 июня 1982'
    : finding?.series === 'Голуби' ? '5 июня 1981'
    : finding?.series === 'Птицы СССР' && finding.year === '1962' ? '26 декабря 1962'
    : finding?.series === 'Птицы СССР' && finding.year === '1979' ? '18 сентября 1979'
    : finding?.series === 'Водоплавающие птицы' && finding.year === '1976' ? '18 августа 1976' : '';
  const issueContext = finding?.series === 'Вымершие птицы' ? 'Кубинский ара был эндемиком Кубы и исчез в XIX веке; выпуск 28 августа 1974 года посвящён исчезнувшим птицам.'
    : finding?.series === 'Международный орнитологический конгресс' ? 'Серия посвящена XVIII Международному орнитологическому конгрессу в Москве.'
    : finding?.series === 'Эндемичные птицы Кубы' ? 'Серия рассказывает о птицах, характерных для Кубы, в том числе местных эндемиках.'
    : finding?.series === 'Птицы Никарагуа' ? 'Серия показывает птиц Центральной Америки и выпущена почтой Никарагуа.'
    : finding?.series === 'Голуби' ? 'Выпуск объединяет несколько видов голубей Вьетнама.'
    : finding ? `Тематический выпуск «${finding.series}».` : '';
  return {
    id, displayName: finding ? `${finding.title} · лист ${pi + 1}` : `Марка ${String(i + 1).padStart(2, '0')} · лист ${pi + 1}`,
    country: (id === 'album-2-18' ? 'Польша' : country).replace(' (надпись видна)', ''), issueYear: finding?.year ?? '', denomination: finding?.face ?? '', denominationCurrency: finding?.face ? currency : '', series: finding?.series ?? '', subject: finding?.subject ?? readableSubjects,
    condition: finding ? 'По фото: состояние и целостность зубцов не оценены' : '', gumPerforation: finding ? 'Клей и перфорация по фото не определены' : '',
    usedOrMint: '', estimatedValue: finding ? (finding.uncertain ? '0–0,05' : country === 'Австралия' ? '0,02–0,10' : country === 'Польша' || country === 'Венгрия' ? '0,02–0,08' : '0,01–0,05') : '',
    estimateCurrency: finding ? 'USD' : '', valuationSource: finding ? `Ориентир для обычных гашёных экземпляров в подборке, НЕ подтверждённая продажа именно этой марки. Групповые цены предложений дилера Eagle Stamps: ${marketSource}. Без осмотра и сопоставимых завершённых торгов стоимость конкретного экземпляра не установлена.` : '',
    history: finding ? `${issueContext}${date ? ` Дата выпуска: ${date}.` : ''} Сюжет: ${finding.subject}. ${finding.uncertain ? 'Атрибуция предварительная; точный вид, выпуск или номинал требуют проверки оригинала. ' : ''}Каталожная сверка: ${finding.source}.` : '',
    confidence: finding ? (finding.uncertain ? 'Визуальная фиксация' : 'Сверено с каталогом') : 'Визуальная фиксация',
    reviewStatus: finding?.uncertain ? 'Нужно проверить' : finding ? 'Проверено' : 'Нужно проверить', sourceAlbumPage: pi + 1,
    crop: rectifyCrop({ x: (id === 'album-2-06' ? 591 : r[0]) / 768 * 100, y: r[1] / 1024 * 100, width: (id === 'album-2-06' ? 163 : r[2]) / 768 * 100, height: (id === 'album-2-06' ? 110 : r[3]) / 1024 * 100 }, pi)
  };
})).filter(record => !emptyCropIds.has(record.id));

// Update legacy blank cards without overwriting fields the owner edited.
function enrichExisting(records: StampRecord[]): StampRecord[] {
  return records.flatMap(record => {
    const researched = seedRecords.find(candidate => candidate.id === record.id);
    if (!researched) {
      if (emptyCropIds.has(record.id) && /^Марка \d+ · лист \d+$/.test(record.displayName)) return [];
      return [record];
    }
    const baselineName = `Марка ${record.id.slice(-2)} · лист ${record.sourceAlbumPage}`;
    const changes: Partial<StampRecord> = {};
    for (const field of ['issueYear','denomination','denominationCurrency','series','condition','gumPerforation','estimatedValue','estimateCurrency','valuationSource','history'] as const) {
      if (!record[field]) changes[field] = researched[field];
    }
    if (record.displayName === baselineName) changes.displayName = researched.displayName;
    if (record.subject === 'Птицы' || !record.subject) changes.subject = researched.subject;
    if (record.country.includes(' (надпись видна)') || record.country === 'Не определена') changes.country = researched.country;
    if (record.confidence === 'Визуальная фиксация') changes.confidence = researched.confidence;
    if (record.reviewStatus === 'Нужно проверить') changes.reviewStatus = researched.reviewStatus;
    if (record.id === 'album-2-06' && record.crop.width < researched.crop.width / 2) changes.crop = researched.crop;
    // Earlier research drafts misidentified this plainly printed flamingo.
    // Replace only the draft's own untouched values, never an owner's edits.
    if (record.id === 'album-1-02' && record.displayName === 'Птица на ветке · лист 1') {
      changes.displayName = researched.displayName;
      if (record.subject === 'Вид не установлен') changes.subject = researched.subject;
      if (record.confidence === 'Визуальная фиксация') changes.confidence = researched.confidence;
      if (record.reviewStatus === 'Нужно проверить') changes.reviewStatus = researched.reviewStatus;
      if (record.history.includes('Сюжет: Вид не установлен.')) changes.history = researched.history;
    }
    return [{...record, ...changes}];
  });
}

function getInitial(): StampRecord[] {
  try {
    const value = localStorage.getItem(STORE);
    if (value) {
      const records = JSON.parse(value) as StampRecord[];
      const geometryVersion = localStorage.getItem(GEOMETRY_KEY)
        ?? (localStorage.getItem('philatelic-archive-rectified-v1') ? 'v1' : null);
      if (geometryVersion !== CATALOG_GEOMETRY) {
        const migrated = records.map((record) => ({
          ...record,
          crop: geometryVersion === 'v2'
            ? rectifyCrop(unrectifyCrop(removeOldCropMargin(unrectifyCrop(record.crop, record.sourceAlbumPage - 1)), record.sourceAlbumPage - 1), record.sourceAlbumPage - 1)
            : geometryVersion === 'v1'
              ? expandCrop(record.crop)
              : rectifyCrop(record.crop, record.sourceAlbumPage - 1),
        }));
        // Persist the data before its marker; React may initialize state twice.
        localStorage.setItem(`${STORE}-before-geometry-v3`, value);
        localStorage.setItem(STORE, JSON.stringify(migrated));
        localStorage.setItem(GEOMETRY_KEY, CATALOG_GEOMETRY);
        if (localStorage.getItem(RESEARCH_KEY) !== RESEARCH_VERSION) {
          const enriched = enrichExisting(migrated);
          localStorage.setItem(STORE, JSON.stringify(enriched));
          localStorage.setItem(RESEARCH_KEY, RESEARCH_VERSION);
          return enriched;
        }
        return migrated;
      }
      if (localStorage.getItem(RESEARCH_KEY) !== RESEARCH_VERSION) {
        localStorage.setItem(`${STORE}-before-research-${RESEARCH_VERSION}`, value);
        const enriched = enrichExisting(records);
        localStorage.setItem(STORE, JSON.stringify(enriched));
        localStorage.setItem(RESEARCH_KEY, RESEARCH_VERSION);
        return enriched;
      }
      return records;
    }
    localStorage.setItem(GEOMETRY_KEY, CATALOG_GEOMETRY);
    localStorage.setItem(RESEARCH_KEY, RESEARCH_VERSION);
  } catch { /* use the album inventory if storage is unavailable */ }
  return seedRecords;
}
function CropImage({ record, className = '' }: { record: StampRecord; className?: string }) {
  const { x, y, width, height } = record.crop;
  const page = PAGE_GEOMETRY[record.sourceAlbumPage - 1] ?? PAGE_GEOMETRY[0];
  return <div className={`stamp-image ${className}`} data-testid={`image-stamp-${record.id}`} style={{
    aspectRatio: String((page.width / page.height) * (width / Math.max(height, 0.01))),
  }}>
    <img src={images[record.sourceAlbumPage - 1]} alt={record.displayName} style={{
      width: `${10000 / width}%`, height: `${10000 / height}%`,
      left: `${-x / width * 100}%`, top: `${-y / height * 100}%`
    }} />
  </div>;
}
function App() {
  const [records, setRecords] = useState<StampRecord[]>(getInitial);
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Все страны');
  const [statusFilter, setStatusFilter] = useState('Все записи');
  const [editing, setEditing] = useState<StampRecord | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(records));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [records]);
  const idFromPath = location.match(/^\/collection\/([^/]+)/)?.[1];
  const activeRecord = idFromPath && idFromPath !== 'new' ? records.find(r => r.id === idFromPath) : undefined;
  const exportCatalog = () => {
    try {
      const url = URL.createObjectURL(new Blob([serializeCatalog(records)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `stamp-catalog-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setTransferMessage('Файл каталога подготовлен. Сохраните его вне браузера и выберите «Импорт каталога» на другом устройстве.');
    } catch (error) {
      setTransferMessage(error instanceof Error ? `Не удалось экспортировать каталог: ${error.message}` : 'Не удалось экспортировать каталог.');
    }
  };
  const importCatalog = async (file: File) => {
    setImporting(true);
    setTransferMessage('');
    try {
      if (file.size > MAX_CATALOG_BYTES) throw new Error('Файл слишком большой. Максимальный размер — 10 МБ.');
      const imported = parseCatalog(await file.text());
      if (!window.confirm(`Заменить весь каталог?\n\nСейчас записей: ${records.length}. В файле: ${imported.length}.${imported.length === 0 ? '\nФайл пустой: все текущие карточки будут удалены.' : ''}\n\nВсе текущие записи и ручные исправления будут заменены, а не объединены. Отменить замену нельзя. Если нужна копия текущего каталога, нажмите «Отмена» и сначала экспортируйте его.`)) {
        setTransferMessage('Импорт отменён. Каталог не изменён.');
        return;
      }
      // One atomic write: quota/security failures must leave the old catalog
      // and the visible cards intact. Initial loading already sets current markers.
      try { localStorage.setItem(STORE, JSON.stringify(imported)); }
      catch { throw new Error('Не удалось сохранить каталог на устройстве. Проверьте свободное место и разрешение на хранение данных. Текущий каталог не изменён.'); }
      setRecords(imported);
      setEditing(null);
      setSearch(''); setCountryFilter('Все страны'); setStatusFilter('Все записи');
      setLocation('/collection');
      setTransferMessage(`Импорт завершён. Записей: ${imported.length}. Каталог сохранён на этом устройстве.`);
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Не удалось прочитать файл. Каталог не изменён.');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const countries = useMemo(() => [...new Set(records.map(r => r.country).filter(c => c && c !== 'Не определена'))], [records]);
  const valued = records.filter(r => r.estimatedValue.trim() !== '').length;
  const addRecord = () => {
    const id = `local-${Date.now()}`;
    const fresh: StampRecord = { id, displayName: 'Новая марка', country: '', issueYear: '', denomination: '', denominationCurrency: '', series: '', subject: '', condition: '', gumPerforation: '', usedOrMint: '', estimatedValue: '', estimateCurrency: '', valuationSource: '', history: '', confidence: 'Со слов владельца', reviewStatus: 'Нужно проверить', sourceAlbumPage: 1, crop: { x: 0, y: 0, width: 100, height: 100 } };
    setRecords(prev => [fresh, ...prev]); setLocation(`/collection/${id}`);
  };
  const saveRecord = (record: StampRecord) => { setRecords(prev => prev.some(r => r.id === record.id) ? prev.map(r => r.id === record.id ? record : r) : [record, ...prev]); setEditing(null); setLocation('/collection'); };
  const deleteRecord = (id: string) => { setRecords(prev => prev.filter(r => r.id !== id)); setEditing(null); setLocation('/collection'); };
  const nav = <aside className="sidebar">
    <Link href="/" className="brand"><span className="brand-mark"><Stamp size={19}/></span><span><span className="brand-title">Лист памяти</span><span className="brand-sub">личный архив марок</span></span></Link>
    <div className="nav-label">Архив</div>
    <nav>
      <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`} data-testid="link-dashboard"><Grid2X2 size={17}/> Обзор</Link>
      <Link href="/collection" className={`nav-link ${location.startsWith('/collection') ? 'active' : ''}`} data-testid="link-collection"><Archive size={17}/> Коллекция <span style={{marginLeft:'auto',fontFamily:'var(--app-font-mono)',fontSize:10}}>{records.length}</span></Link>
    </nav>
    <div className="side-bottom"><strong>Медленно — значит внимательно.</strong><br/>Факты из альбома отделены от того, что ещё предстоит установить.</div>
  </aside>;
  return <div className="app-shell"><div className="grain"/><div className="shell-grid">{nav}<main className="main">
    <header className="topbar"><div className="crumb">ЛИЧНЫЙ ФИЛАТЕЛИСТИЧЕСКИЙ АРХИВ&nbsp; / &nbsp;ЛИСТЫ 01—03</div><div className="top-actions"><span><i className="sync-dot"/> <span className="status-text">{storageError ? 'Не удалось сохранить изменения' : 'Изменения сохранены на этом устройстве'}</span></span><BookOpen size={16}/></div></header>
    <section aria-label="Перенос каталога" style={{padding:'16px clamp(18px,4vw,58px)',borderBottom:'1px solid #ddd7c9'}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <button className="button" onClick={exportCatalog} disabled={importing || !!editing || !!activeRecord} data-testid="button-export-catalog">Экспорт каталога</button>
        <button className="button" onClick={() => fileInput.current?.click()} disabled={importing || !!editing || !!activeRecord} data-testid="button-import-catalog">{importing ? 'Проверка файла…' : 'Импорт каталога'}</button>
        <span style={{fontSize:12,color:'#68756d'}}>JSON · все карточки, заметки и границы вырезки. Фото уже доступны в приложении.</span>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Файл каталога" data-testid="input-import-catalog" onChange={event => { const file = event.target.files?.[0]; if (file) void importCatalog(file); }}/>
      {transferMessage && <p role="status" style={{fontSize:13,marginBottom:0}}>{transferMessage}</p>}
      {storageError && <p role="alert">Изменения не сохранены в браузере. Экспортируйте каталог сейчас, чтобы не потерять их.</p>}
    </section>
    <Switch>
      <Route path="/collection/:id"><CollectionPage records={records} search={search} setSearch={setSearch} countries={countries} countryFilter={countryFilter} setCountryFilter={setCountryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={addRecord} onEdit={setEditing}/></Route>
      <Route path="/collection"><CollectionPage records={records} search={search} setSearch={setSearch} countries={countries} countryFilter={countryFilter} setCountryFilter={setCountryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={addRecord} onEdit={setEditing}/></Route>
      <Route path="/"><Dashboard records={records} valued={valued} onAdd={addRecord}/></Route>
      <Route><div className="content"><h1>Страница не найдена</h1><Link className="text-link" href="/">Вернуться в архив</Link></div></Route>
    </Switch>
    {activeRecord && <StampDrawer key={activeRecord.id} record={activeRecord} onClose={() => setLocation('/collection')} onSave={saveRecord} onDelete={deleteRecord}/>}
    {editing && <StampDrawer key={`edit-${editing.id}`} record={editing} onClose={() => setEditing(null)} onSave={saveRecord} onDelete={deleteRecord} />}
    <div className="footer-note">Каталог личной коллекции · оценки ориентировочные, не экспертиза · данные хранятся локально</div>
  </main></div></div>;
}
function Dashboard({ records, valued, onAdd }: { records: StampRecord[]; valued: number; onAdd: () => void }) {
  const countries = records.reduce<Record<string, number>>((acc, r) => { const k = r.country && r.country !== 'Не определена' ? r.country : 'Страна не указана'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const recent = records.slice(0, 4);
  const coverage = records.length ? Math.round(valued / records.length * 100) : 0;
  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">Ваш архив · обзор</div><h1>Коллекция, которой<br/>есть что рассказать.</h1><p className="lead">Каждая марка — отдельная запись. Неизвестное пока остаётся неизвестным.</p></div><button className="button primary" onClick={onAdd} data-testid="button-add-stamp"><Plus size={16}/> Добавить марку</button></div>
    <div className="metrics">
      <div className="metric-card"><div className="metric-label">В альбоме учтено</div><div className="metric-value">{records.length}</div><div className="metric-note">отдельных марок в каталоге</div></div>
      <div className="metric-card"><div className="metric-label">Ориентир стоимости</div><div className="metric-value">{valued}</div><div className="metric-note">записей с оценкой</div></div>
      <div className="metric-card"><div className="metric-label">Нужна проверка</div><div className="metric-value">{records.filter(r => r.reviewStatus !== 'Проверено').length}</div><div className="metric-note">атрибуция не подтверждена</div></div>
    </div>
    <ValuationSummary records={records}/>
    <div className="lower-grid">
      <section><div className="section-head"><h2>Недавно в архиве</h2><Link href="/collection" className="text-link">Вся коллекция <ArrowUpRight size={13} style={{verticalAlign:'middle'}}/></Link></div>
        {recent.length ? <div className="recent-grid">{recent.map(r => <Link key={r.id} href={`/collection/${r.id}`} className="stamp-card" data-testid={`card-stamp-${r.id}`}><CropImage record={r}/><div className="stamp-info"><div className="stamp-title">{r.displayName}</div><div className="stamp-meta">{r.country || 'Страна не указана'} · стр. {r.sourceAlbumPage}</div></div></Link>)}</div> : <Empty onAdd={onAdd}/>}
        <div className="coverage"><div className="coverage-title"><span>Покрытие оценкой</span><strong>{coverage}%</strong></div><div className="bar"><span style={{width:`${coverage}%`}}/></div><small>Ориентир продажи в подборке, а не цена состоявшихся торгов. Состояние по фотографиям не оценено.</small></div>
      </section>
      <section><div className="section-head"><h2>География</h2><CircleHelp size={16} color="#8b968e"/></div>
        <div className="summary-panel">{Object.entries(countries).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([country,count],i)=><div className="summary-row" key={country}><span className="country-line"><i className="country-dot" style={{background:['#ce8d6e','#6e917e','#baad78','#8797a0','#aa786d','#7d9a85'][i%6]}}/>{country}</span><span className="country-count">{count} марок</span></div>)}</div>
        <div className="notice"><Feather size={14} style={{verticalAlign:'middle',marginRight:7}}/>Каталожные данные сверены для определённых выпусков; спорные экземпляры помечены. Оценки — ориентир для продажи в подборке, не экспертиза.</div>
      </section>
    </div>
  </div>;
}
function Empty({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><ImagePlus size={22}/></div><h3>Здесь пока тихо</h3><p>Добавьте первую запись, чтобы начать каталог.</p><button className="button primary" onClick={onAdd}><Plus size={15}/> Добавить марку</button></div>;
}
function CollectionPage({ records, search, setSearch, countries, countryFilter, setCountryFilter, statusFilter, setStatusFilter, onAdd, onEdit }: {
  records: StampRecord[]; search: string; setSearch: (s: string) => void; countries: string[]; countryFilter: string; setCountryFilter: (s: string) => void; statusFilter: string; setStatusFilter: (s: string) => void; onAdd: () => void; onEdit: (r: StampRecord) => void;
}) {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const shown = records.filter(r => {
    const haystack = [r.displayName,r.country,r.issueYear,r.subject,r.series,r.denomination].join(' ').toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (countryFilter === 'Все страны' || r.country === countryFilter) && (statusFilter === 'Все записи' || (statusFilter === 'Нужно проверить' ? r.reviewStatus !== 'Проверено' : r.reviewStatus === 'Проверено'));
  });
  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">Каталог · {id ? 'карточка марки' : 'все записи'}</div><h1>Коллекция</h1><p className="lead">Один экземпляр — одна карточка. Сомнительное не выдаём за установленное.</p></div><button className="button primary" onClick={onAdd} data-testid="button-add-stamp"><Plus size={16}/> Добавить</button></div>
    <div className="toolbar"><div className="search-box"><Search size={16}/><input type="search" placeholder="Название, страна, тема…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-stamps"/></div>
      <select className="select-control" value={countryFilter} onChange={e => setCountryFilter(e.target.value)} data-testid="select-country"><option>Все страны</option>{countries.map(c=><option key={c}>{c}</option>)}</select>
      <select className="select-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="select-review-status"><option>Все записи</option><option>Нужно проверить</option><option>Проверено</option></select>
      <span className="count-note">{shown.length} / {records.length} марок</span>
    </div>
    {shown.length ? <div className="collection-grid">{shown.map(r=><article key={r.id} className="stamp-card" onClick={()=>onEdit(r)} data-testid={`card-stamp-${r.id}`}><CropImage record={r}/><div className="stamp-info"><div className="stamp-title">{r.displayName}</div><div className="stamp-meta">{r.country || 'Страна не указана'} · стр. {r.sourceAlbumPage}</div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={21}/></div><h3>{records.length ? 'Ничего не найдено' : 'Каталог ждёт первую марку'}</h3><p>{records.length ? 'Измените запрос или фильтр страны.' : 'Запись можно создать вручную — без выдуманных атрибуций.'}</p>{records.length ? <button className="button" onClick={()=>{setSearch('');setCountryFilter('Все страны');setStatusFilter('Все записи')}}><RotateCcw size={14}/> Сбросить фильтры</button> : <button className="button primary" onClick={onAdd}><Plus size={15}/> Добавить марку</button>}</div>}
  </div>;
}
function StampDrawer({ record, onClose, onSave, onDelete }: { record: StampRecord; onClose: () => void; onSave: (r: StampRecord) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState<StampRecord>({...record});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const update = (key: keyof StampRecord, value: string | number | Crop) => { setForm(prev => ({...prev,[key]:value})); setDirty(true); };
  const updateCrop = (key: keyof Crop, value: string) => { const min = key === 'width' || key === 'height' ? 0.1 : 0; const n = Math.max(min,Math.min(key === 'width' || key === 'height' ? 100 : 99, Number(value) || min)); setForm(prev=>({...prev,crop:{...prev.crop,[key]:n}})); setDirty(true); };
  const close = () => { if (dirty && !window.confirm('Закрыть карточку без сохранения изменений?')) return; onClose(); };
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="drawer" role="dialog" aria-modal="true" aria-label="Карточка марки">
    <header className="drawer-head"><strong>{record.id.startsWith('local-') ? 'Новая запись' : 'Карточка марки'}</strong><button className="icon-button" onClick={close} aria-label="Закрыть"><X size={17}/></button></header>
    <div className="drawer-body">
      <div className="detail-top"><div className="detail-photo"><CropImage record={form}/></div><div><div className="eyebrow">Страница альбома {form.sourceAlbumPage}</div><h2 className="detail-title">{form.displayName || 'Без названия'}</h2><span className="status-pill"><CircleHelp size={12}/>{form.reviewStatus}</span><p className="detail-summary">{form.history || 'Атрибуция пока не подтверждена.'}</p><button className="button ghost" onClick={()=>document.getElementById('edit-fields')?.scrollIntoView({behavior:'smooth'})}><Pencil size={14}/> Редактировать запись</button></div></div>
      <div className="notice"><Coins size={14} style={{verticalAlign:'middle',marginRight:7}}/>{form.estimatedValue ? `Ориентир: ${form.estimatedValue} ${form.estimateCurrency} за экземпляр в подборке. Это не цена подтверждённой продажи и не оценка сохранности.` : 'Стоимость не установлена.'}</div>
      <form id="edit-fields" onSubmit={e=>{e.preventDefault();onSave(form)}}><div className="section-kicker">Каталожные сведения</div>
        <div className="form-grid">
          <Field label="Название для каталога" value={form.displayName} placeholder="Например: птица на ветке" onChange={v=>update('displayName',v)}/>
          <Field label="Страна / эмитент" value={form.country} placeholder="Не установлено" onChange={v=>update('country',v)}/>
          <Field label="Год выпуска" value={form.issueYear} placeholder="Оставьте пустым, если неизвестен" onChange={v=>update('issueYear',v)}/>
          <Field label="Серия" value={form.series} placeholder="Не установлена" onChange={v=>update('series',v)}/>
          <Field label="Номинал" value={form.denomination} placeholder="Читаемый номинал" onChange={v=>update('denomination',v)}/>
          <Field label="Валюта номинала" value={form.denominationCurrency} placeholder="Например: коп." onChange={v=>update('denominationCurrency',v)}/>
          <Field label="Сюжет / вид" value={form.subject} placeholder="Только то, что видно" onChange={v=>update('subject',v)}/>
          <Field label="Состояние" value={form.condition} placeholder="Не оценено" onChange={v=>update('condition',v)}/>
          <Field label="Клей / перфорация" value={form.gumPerforation} placeholder="Не проверено" onChange={v=>update('gumPerforation',v)}/>
          <div className="field"><label>Гашёная / негашёная</label><select value={form.usedOrMint} onChange={e=>update('usedOrMint',e.target.value)}><option value="">Не определено</option><option>Гашёная</option><option>Негашёная</option><option>Неизвестно</option></select></div>
          <div className="field"><label>Статус проверки</label><select value={form.reviewStatus} onChange={e=>update('reviewStatus',e.target.value)}><option>Нужно проверить</option><option>Проверено</option><option>Визуальная фиксация</option></select></div>
          <div className="field"><label>Уверенность / происхождение</label><select value={form.confidence} onChange={e=>update('confidence',e.target.value)}><option>Визуальная фиксация</option><option>Со слов владельца</option><option>Сверено с каталогом</option><option>Не установлено</option></select></div>
          <Field label="История / заметки" value={form.history} placeholder="Личные заметки о марке" onChange={v=>update('history',v)} full multiline/>
        </div>
        <div className="section-kicker">Рыночный ориентир / оценка владельца</div><div className="form-grid">
          <Field label="Оценочная стоимость" value={form.estimatedValue} placeholder="Не указана" onChange={v=>update('estimatedValue',v)}/>
          <Field label="Валюта оценки" value={form.estimateCurrency} placeholder="Например: RUB" onChange={v=>update('estimateCurrency',v)}/>
          <Field label="Источник оценки" value={form.valuationSource} placeholder="Личная оценка / источник" onChange={v=>update('valuationSource',v)} full/>
        </div>
        {findings[record.id] && <div className="notice">Источники: <a href={findings[record.id].source} target="_blank" rel="noopener noreferrer">тематический каталог BirdTheme</a> · <a href={marketSource} target="_blank" rel="noopener noreferrer">ценовые предложения Eagle Stamps</a>. Вид, состояние и цену отдельного экземпляра следует сверить очно.</div>}
        <div className="section-kicker">Границы вырезки · источник: фото страницы {form.sourceAlbumPage}</div>
        <div className="crop-box" style={{aspectRatio:String((PAGE_GEOMETRY[form.sourceAlbumPage-1] ?? PAGE_GEOMETRY[0]).width/(PAGE_GEOMETRY[form.sourceAlbumPage-1] ?? PAGE_GEOMETRY[0]).height)}}><img src={images[form.sourceAlbumPage-1]} alt="Выровненная страница альбома" style={{width:'100%',height:'100%',top:0,left:0}}/><div className="crop-window" style={{left:`${form.crop.x}%`,top:`${form.crop.y}%`,width:`${form.crop.width}%`,height:`${form.crop.height}%`}}/></div>
        <div className="crop-controls"><CropField label="X, %" value={form.crop.x} onChange={v=>updateCrop('x',v)}/><CropField label="Y, %" value={form.crop.y} onChange={v=>updateCrop('y',v)}/><CropField label="Ширина, %" value={form.crop.width} onChange={v=>updateCrop('width',v)}/><CropField label="Высота, %" value={form.crop.height} onChange={v=>updateCrop('height',v)}/></div>
        <Field label="Номер страницы альбома" value={String(form.sourceAlbumPage)} placeholder="" onChange={v=>update('sourceAlbumPage',Math.min(3,Math.max(1,Number(v)||1)))}/>
        <div className="edit-actions"><button type="button" className="button danger" onClick={()=>setConfirmDelete(true)}><Trash2 size={14}/> Удалить</button><button type="button" className="button" onClick={close}>Отмена</button><button className="button primary" type="submit"><Save size={14}/> Сохранить</button></div>
        {confirmDelete && <div className="delete-confirm"><span>Удалить эту запись из каталога? Это действие нельзя отменить.</span><button type="button" className="button danger" onClick={()=>onDelete(form.id)}>Удалить запись</button><button type="button" className="icon-button" onClick={()=>setConfirmDelete(false)} aria-label="Отмена"><X size={15}/></button></div>}
      </form>
    </div>
  </section></div>;
}
function Field({ label, value, placeholder, onChange, full = false, multiline = false }: { label:string; value:string; placeholder?:string; onChange:(v:string)=>void; full?:boolean; multiline?:boolean }) {
  return <div className={`field ${full?'full':''}`}><label>{label}</label>{multiline?<textarea value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>:<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>}</div>;
}
function CropField({ label, value, onChange }: { label:string; value:number; onChange:(v:string)=>void }) {
  return <div className="field"><label>{label}</label><input type="number" min="0" max="100" step=".1" value={value} onChange={e=>onChange(e.target.value)}/></div>;
}
export default App;
