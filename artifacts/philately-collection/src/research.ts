import { z } from 'zod';

// Backups carry the coordinate space and research revision so restoring on a
// different browser never reapplies migrations to the owner's edited cards.
export const CATALOG_FORMAT = 'philatelic-archive';
export const CATALOG_GEOMETRY = 'v3';
export const CATALOG_RESEARCH = 'v2';
export const MAX_CATALOG_BYTES = 10 * 1024 * 1024;
const text = z.string();
export const stampRecordSchema = z.object({
  id: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: text, country: text, issueYear: text, denomination: text,
  denominationCurrency: text, series: text, subject: text, condition: text,
  gumPerforation: text, usedOrMint: text, estimatedValue: text, estimateCurrency: text,
  valuationSource: text, history: text, confidence: text, reviewStatus: text,
  sourceAlbumPage: z.number().int().min(1).max(3),
  // Rectification can put an edge slightly outside the photo.
  crop: z.object({
    x: z.number().finite().min(-100).max(100),
    y: z.number().finite().min(-100).max(100),
    width: z.number().finite().positive().max(200),
    height: z.number().finite().positive().max(200),
  }).strict(),
}).strict();
export type StampRecord = z.infer<typeof stampRecordSchema>;
export type Crop = StampRecord['crop'];
export const catalogSchema = z.object({
  format: z.literal(CATALOG_FORMAT),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  geometryVersion: z.literal(CATALOG_GEOMETRY),
  researchVersion: z.literal(CATALOG_RESEARCH),
  records: z.array(stampRecordSchema).max(10000).refine(
    records => new Set(records.map(record => record.id)).size === records.length,
    'Идентификаторы карточек не должны повторяться',
  ),
}).strict();
export function serializeCatalog(records: StampRecord[]): string {
  const content = JSON.stringify(catalogSchema.parse({
    format: CATALOG_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    geometryVersion: CATALOG_GEOMETRY, researchVersion: CATALOG_RESEARCH, records,
  }), null, 2);
  if (new Blob([content]).size > MAX_CATALOG_BYTES) {
    throw new Error('Каталог превышает допустимый размер файла 10 МБ.');
  }
  return content;
}
export function parseCatalog(content: string): StampRecord[] {
  let value: unknown;
  try { value = JSON.parse(content.replace(/^\uFEFF/, '')); }
  catch { throw new Error('Файл не является корректным JSON. Выберите файл экспорта каталога.'); }
  const result = catalogSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Файл не соответствует формату каталога: неподдерживаемая версия, неверные поля, координаты или повторяющиеся идентификаторы. Данные не изменены.');
  }
  return result.data.records;
}

// Research-based inventory. A dash means that the photograph or catalogue does
// not support a more precise attribution; it is not a missing UI value.
export type Finding = {
  title: string; year: string; face: string; series: string;
  subject: string; source: string; note?: string; uncertain?: boolean;
};
const CUBA = 'https://www.birdtheme.org/country/cuba.html';
const USSR = 'https://www.birdtheme.org/country/russussr.html';
const VIETNAM = 'https://www.birdtheme.org/country/vietnam.html';
const NICARAGUA = 'https://www.birdtheme.org/country/nicaragu.html';
const POLAND = 'https://www.birdtheme.org/country/poland.html';
const NAMIBIA = 'https://www.birdtheme.org/country/namibia.html';
const AUSTRALIA = 'https://www.birdtheme.org/country/australia.html';
const HUNGARY = 'https://www.birdtheme.org/country/hungary.html';
const CZECHOSLOVAKIA = 'https://www.birdtheme.org/country/czechosl.html';
const PRICE = 'https://www.eaglestamps.com/flist.htm';

// Each row corresponds to the numbered crop on its album page.
// Exact issue dates are recorded in the series notes below, not inferred from
// cancellation dates. A question mark after a name signals a visual hypothesis.
const rows: Record<number, string[]> = {
  1: [
    'Кубинский ара|1974|3|Вымершие птицы|Ara tricolor|cuba',
    'Розовый фламинго|1962|16|Птицы СССР|Phoenicopterus roseus|ussr',
    'Белогорлая чекановая птица|1981|32|Певчие птицы|Saxicola insignis|ussr',
    'Винногорлая суторка|1981|20|Певчие птицы|Suthora webbiana|ussr',
    'Райская мухоловка|1981|10|Певчие птицы|Terpsiphone incei|ussr',
    'Кубинский трогон|1976|30|Эндемичные птицы Кубы|Priotelus temnurus|cuba',
    'Фернандинский дятел|1976|3|Эндемичные птицы Кубы|Colaptes fernandinae|cuba',
    'Восточная кубинская славка|1976|1|Эндемичные птицы Кубы|Teretistris fornsi|cuba',
    'Овсянка Янковского|1981|15|Певчие птицы|Emberiza jankowskii|ussr',
    'Ястреб Гундлаха|1976|13|Эндемичные птицы Кубы|Astur gundlachi|cuba',
    'Кубинский тоди|1976|5|Эндемичные птицы Кубы|Todus multicolor|cuba',
    'Кубинский воробьиный сыч|1976|2|Эндемичные птицы Кубы|Glaucidium siju|cuba',
    'Белобровая синичья славка|1981|6|Певчие птицы|Leptopoecile sophiae|ussr',
    'Сапата-пастушок|1975|30|Эндемичные птицы Кубы|Mustelirallus cerverai|cuba',
    'Кубинский коршун|1975|13|Эндемичные птицы Кубы|Chondrohierax wilsonii|cuba',
    'Кубинский попугайчик|1975|3|Эндемичные птицы Кубы|Psittacara euops|cuba',
    'Кубинский виреон|1975|1|Эндемичные птицы Кубы|Vireo gundlachii|cuba',
    'Синеголовый голубь|1975|5|Эндемичные птицы Кубы|Starnoenas cyanocephala|cuba',
    'Кубинская птица, авиапочта|?|30|Авиапочта Кубы|Вид не установлен|cuba|?',
    'Хищная птица Вьетнама|1982|30|Хищные птицы|Вид требует сверки|vietnam|?',
    'Хищная птица Вьетнама|1982|30|Хищные птицы|Вид требует сверки|vietnam|?',
    'Хищная птица Вьетнама|1982|40|Хищные птицы|Вид требует сверки|vietnam|?',
    'Хищная птица Вьетнама|1982|30|Хищные птицы|Вид требует сверки|vietnam|?',
    'Хищная птица Вьетнама|1982|50|Хищные птицы|Вид требует сверки|vietnam|?',
    'Кубинские петухи|?|30|Домашние птицы|Петухи|cuba|?',
    'Кубинский петух|?|1|Домашние птицы|Петух|cuba|?',
    'Кубинский петух|?|50|Домашние птицы|Петух|cuba|?',
    'Кубинский петух|?|13|Домашние птицы|Петух|cuba|?',
    'Кубинский петух|?|7|Домашние птицы|Петух|cuba|?',
    'Кубинский петух|?|3|Домашние птицы|Петух|cuba|?',
  ],
  2: [
    'Алый ара|1981|2|Птицы Никарагуа|Ara macao|nicaragua',
    'Момот Лессона|1981|6|Птицы Никарагуа|Momotus lessonii|nicaragua',
    'Темнохвостый трогон|1981|3|Птицы Никарагуа|Trogon massena|nicaragua',
    'Полосатый дятел|1981|0,50|Птицы Никарагуа|Dryocopus lineatus|nicaragua',
    'Птица Намибии — тариф открытки|?|?|Почтовый тариф Postcard Rate|Вид не установлен|namibia|?',
    'Польская композиция с птицами|?|?|Птицы Польши, фрагмент блока|Несколько птиц; марки внутри блока не разделены|poland|?',
    '', '', '', '', '', '', '',
    'Попугайчик Финша|1981|1,80|Птицы Никарагуа|Psittacara finschi|nicaragua',
    'Фиолетовый саблекрыл|1981|4|Птицы Никарагуа|Campylopterus hemileucurus|nicaragua',
    'Радужный тукан|1981|1,20|Птицы Никарагуа|Ramphastos sulfuratus|nicaragua',
    'Дятел Венгрии|?|140|Птицы Венгрии|Вид не установлен|hungary|?',
    'Фазан обыкновенный|?|6|Птицы Польши|Phasianus colchicus|poland|?',
    'Лесная птица Чехословакии|?|80|Птицы Чехословакии|Вид не установлен|czechoslovakia|?',
    'Степная пустельга|1975|1|Соколы Польши|Falco naumanni|poland',
    'Водоплавающая птица, Экспо-75|1975|10|Международная выставка Окинава|Вид требует уточнения|ussr|?',
    'Зелёный императорский голубь|1981|12|Голуби|Ducula aenea|vietnam',
    'Горный императорский голубь|1981|40|Голуби|Ducula badia|vietnam',
    'Красношейная горлица|1981|20|Голуби|Streptopelia tranquebarica|vietnam',
    'Полосатая кукушковая горлица|1981|30|Голуби|Macropygia unchall|vietnam',
    'Зелёный голубь Вьетнама|1981|50|Голуби|Treron apicauda; предположительно|vietnam|?',
    'Птица Вьетнама|?|?|Птицы Вьетнама|Вид не установлен|vietnam|?',
    'Птица Вьетнама|?|60|Птицы Вьетнама|Вид не установлен|vietnam|?',
    'Птица Вьетнама|1981|50|Голуби|Вид требует сверки|vietnam|?',
    'Птица Вьетнама|?|?|Птицы Вьетнама|Вид не установлен|vietnam|?',
    'Птица Вьетнама|?|60|Птицы Вьетнама|Вид не установлен|vietnam|?',
    'Птица Вьетнама|?|50|Птицы Вьетнама|Вид не установлен|vietnam|?',
    'Австралийская птица|?|5|Птицы Австралии|Вид требует сверки|australia|?',
    'Польские водоплавающие птицы|?|?|Охрана природы|Вид требует сверки|poland|?',
    'Польские лебеди|?|?|Охрана природы|Вид требует сверки|poland|?',
  ],
  3: [
    'Сипуха|1979|10|Птицы СССР|Tyto alba|ussr',
    'Хохлатая синица|1979|4|Птицы СССР|Lophophanes cristatus|ussr',
    'Козодой обыкновенный|1979|15|Птицы СССР|Caprimulgus europaeus|ussr',
    'Малый пёстрый дятел|1979|3|Птицы СССР|Dryobates minor|ussr',
    'Индейка|1990|15|Домашние птицы СССР|Домашняя индейка|ussr|?',
    'Гуси|1990|5|Домашние птицы СССР|Домашние гуси|ussr|?',
    'Куры|1990|10|Домашние птицы СССР|Домашние куры|ussr|?',
    'Птицы на синем фоне|1975|1|Фауна СССР|Вид не установлен|ussr|?',
    'Филин|1990|20|Охрана природы|Bubo bubo|ussr|?',
    'Восточный аист|1982|32|Международный орнитологический конгресс|Ciconia boyciana|ussr',
    'Венценосный журавль|1984|5|Московский зоопарк|Balearica regulorum|ussr',
    'Горный гусь|1982|10|Международный орнитологический конгресс|Anser indicus|ussr',
    'Чёрный журавль|1982|2|Международный орнитологический конгресс|Grus monacha|ussr',
    'Кулик-лопатень|1982|6|Международный орнитологический конгресс|Calidris pygmaea|ussr',
    'Белоплечий орлан|1982|4|Международный орнитологический конгресс|Haliaeetus pelagicus|ussr',
    'Сова, СССР|?|?|Птицы СССР|Вид не установлен|ussr|?',
    'Сова, СССР|?|?|Птицы СССР|Вид не установлен|ussr|?',
    'Птица, СССР|?|10|Птицы СССР|Вид не установлен|ussr|?',
    'Пеганка|1989|5|Водоплавающие птицы СССР|Tadorna tadorna|ussr',
    'Иволга обыкновенная|1979|2|Птицы СССР|Oriolus oriolus|ussr',
    'Иволга обыкновенная (край марки)|1979|2|Птицы СССР|Oriolus oriolus|ussr|?',
    'Утка, СССР|?|20|Водоплавающие птицы СССР|Вид требует сверки|ussr|?',
    'Утка, СССР|?|5|Водоплавающие птицы СССР|Вид требует сверки|ussr|?',
    'Утка, СССР|?|15|Водоплавающие птицы СССР|Вид требует сверки|ussr|?',
    'Огарь|1989|20|Водоплавающие птицы СССР|Tadorna ferruginea|ussr',
    '', '', '', '', '', '',
    'Птица на синем фоне|?|16|Птицы СССР|Вид не установлен|ussr|?',
    'Белая цапля|1976|1|Водоплавающие птицы|Ardea coromanda|ussr|?',
    'Тупик|1976|6|Водоплавающие птицы|Fratercula arctica|ussr|?',
    'Гагара|1976|3|Водоплавающие птицы|Gavia arctica|ussr|?',
    'Лысуха|1976|4|Водоплавающие птицы|Fulica atra|ussr|?',
    'Птица, СССР|1976|?|Водоплавающие птицы|Вид требует сверки|ussr|?',
    'Птица, СССР|1976|?|Водоплавающие птицы|Вид требует сверки|ussr|?',
  ],
};

const sources: Record<string, string> = { cuba: CUBA, ussr: USSR, vietnam: VIETNAM, nicaragua: NICARAGUA, poland: POLAND, namibia: NAMIBIA, australia: AUSTRALIA, hungary: HUNGARY, czechoslovakia: CZECHOSLOVAKIA };
export const marketSource = PRICE;
export const findings: Record<string, Finding> = {};
for (const [page, entries] of Object.entries(rows)) {
  entries.forEach((row, index) => {
    if (!row) return;
    const [title, year, face, series, subject, sourceKey, uncertainty] = row.split('|');
    findings[`album-${page}-${String(index + 1).padStart(2, '0')}`] = {
      title, year: year === '?' ? '' : year, face: face === '?' ? '' : face,
      series, subject, source: sources[sourceKey], uncertain: uncertainty === '?',
    };
  });
}

// Coordinates that contain only blank album paper or subdivisions of the same
// large Polish item; never delete these from a user's existing local inventory.
export const emptyCropIds = new Set([
  ...Array.from({length: 7}, (_, i) => `album-2-${String(i + 7).padStart(2, '0')}`),
  ...Array.from({length: 6}, (_, i) => `album-3-${String(i + 26).padStart(2, '0')}`),
]);
