// FIFA World Cup 2026 - Match Data
// Horarios en hora Argentina (UTC-3 / Buenos Aires)

const TEAMS = {
    MEX: { name: "México", code: "MX" },
    RSA: { name: "Sudáfrica", code: "ZA" },
    KOR: { name: "Corea del Sur", code: "KR" },
    CZE: { name: "Chequia", code: "CZ" },
    CAN: { name: "Canadá", code: "CA" },
    BIH: { name: "Bosnia", code: "BA" },
    QAT: { name: "Catar", code: "QA" },
    SUI: { name: "Suiza", code: "CH" },
    BRA: { name: "Brasil", code: "BR" },
    MAR: { name: "Marruecos", code: "MA" },
    HAI: { name: "Haití", code: "HT" },
    SCO: { name: "Escocia", code: "GB-SCT" },
    USA: { name: "Estados Unidos", code: "US" },
    PAR: { name: "Paraguay", code: "PY" },
    AUS: { name: "Australia", code: "AU" },
    TUR: { name: "Turquía", code: "TR" },
    GER: { name: "Alemania", code: "DE" },
    CUR: { name: "Curazao", code: "CW" },
    CIV: { name: "Costa de Marfil", code: "CI" },
    ECU: { name: "Ecuador", code: "EC" },
    NED: { name: "Países Bajos", code: "NL" },
    JPN: { name: "Japón", code: "JP" },
    SWE: { name: "Suecia", code: "SE" },
    TUN: { name: "Túnez", code: "TN" },
    BEL: { name: "Bélgica", code: "BE" },
    EGY: { name: "Egipto", code: "EG" },
    IRN: { name: "Irán", code: "IR" },
    NZL: { name: "Nueva Zelanda", code: "NZ" },
    ESP: { name: "España", code: "ES" },
    CPV: { name: "Cabo Verde", code: "CV" },
    KSA: { name: "Arabia Saudita", code: "SA" },
    URU: { name: "Uruguay", code: "UY" },
    FRA: { name: "Francia", code: "FR" },
    SEN: { name: "Senegal", code: "SN" },
    IRQ: { name: "Irak", code: "IQ" },
    NOR: { name: "Noruega", code: "NO" },
    ARG: { name: "Argentina", code: "AR" },
    ALG: { name: "Argelia", code: "DZ" },
    AUT: { name: "Austria", code: "AT" },
    JOR: { name: "Jordania", code: "JO" },
    POR: { name: "Portugal", code: "PT" },
    COD: { name: "R.D. Congo", code: "CD" },
    UZB: { name: "Uzbekistán", code: "UZ" },
    COL: { name: "Colombia", code: "CO" },
    ENG: { name: "Inglaterra", code: "GB-ENG" },
    CRO: { name: "Croacia", code: "HR" },
    GHA: { name: "Ghana", code: "GH" },
    PAN: { name: "Panamá", code: "PA" }
};

const VENUES = {
    mexicoCity: { name: "Ciudad de México", stadium: "Estadio Azteca", country: "🇲🇽", city: "CDMX" },
    guadalajara: { name: "Guadalajara", stadium: "Estadio Akron", country: "🇲🇽", city: "GDL" },
    monterrey: { name: "Monterrey", stadium: "Estadio BBVA", country: "🇲🇽", city: "MTY" },
    toronto: { name: "Toronto", stadium: "BMO Field", country: "🇨🇦", city: "TOR" },
    vancouver: { name: "Vancouver", stadium: "BC Place", country: "🇨🇦", city: "VAN" },
    losAngeles: { name: "Los Ángeles", stadium: "SoFi Stadium", country: "🇺🇸", city: "LA" },
    newYork: { name: "Nueva York/NJ", stadium: "MetLife Stadium", country: "🇺🇸", city: "NYC" },
    dallas: { name: "Dallas", stadium: "AT&T Stadium", country: "🇺🇸", city: "DAL" },
    houston: { name: "Houston", stadium: "NRG Stadium", country: "🇺🇸", city: "HOU" },
    miami: { name: "Miami", stadium: "Hard Rock Stadium", country: "🇺🇸", city: "MIA" },
    atlanta: { name: "Atlanta", stadium: "Mercedes-Benz Stadium", country: "🇺🇸", city: "ATL" },
    boston: { name: "Boston", stadium: "Gillette Stadium", country: "🇺🇸", city: "BOS" },
    philadelphia: { name: "Filadelfia", stadium: "Lincoln Financial Field", country: "🇺🇸", city: "PHI" },
    sanFrancisco: { name: "San Francisco", stadium: "Levi's Stadium", country: "🇺🇸", city: "SF" },
    seattle: { name: "Seattle", stadium: "Lumen Field", country: "🇺🇸", city: "SEA" },
    kansasCity: { name: "Kansas City", stadium: "Arrowhead Stadium", country: "🇺🇸", city: "KC" }
};

// =====================================================
// GRUPOS - 12 grupos de 4 equipos
// =====================================================
const GROUPS = {
    A: ["MEX", "RSA", "KOR", "CZE"],
    B: ["CAN", "BIH", "QAT", "SUI"],
    C: ["BRA", "MAR", "HAI", "SCO"],
    D: ["USA", "PAR", "AUS", "TUR"],
    E: ["GER", "CUR", "CIV", "ECU"],
    F: ["NED", "JPN", "SWE", "TUN"],
    G: ["BEL", "EGY", "IRN", "NZL"],
    H: ["ESP", "CPV", "KSA", "URU"],
    I: ["FRA", "SEN", "IRQ", "NOR"],
    J: ["ARG", "ALG", "AUT", "JOR"],
    K: ["POR", "COD", "UZB", "COL"],
    L: ["ENG", "CRO", "GHA", "PAN"]
};

// =====================================================
// FASE DE GRUPOS - Horarios en hora Argentina (GMT-3)
// Datos verificados desde Google "FIFA World Cup matches"
// =====================================================
const GROUP_STAGE_MATCHES = [
    // ======== JORNADA 1 ========
    { id: 1, date: "2026-06-11", time: "16:00", home: "MEX", away: "RSA", group: "A", venue: "mexicoCity", matchday: 1 },
    { id: 2, date: "2026-06-11", time: "23:00", home: "KOR", away: "CZE", group: "A", venue: "guadalajara", matchday: 1 },
    { id: 3, date: "2026-06-12", time: "16:00", home: "CAN", away: "BIH", group: "B", venue: "toronto", matchday: 1 },
    { id: 4, date: "2026-06-12", time: "22:00", home: "USA", away: "PAR", group: "D", venue: "losAngeles", matchday: 1 },
    { id: 5, date: "2026-06-13", time: "16:00", home: "QAT", away: "SUI", group: "B", venue: "sanFrancisco", matchday: 1 },
    { id: 6, date: "2026-06-13", time: "19:00", home: "BRA", away: "MAR", group: "C", venue: "newYork", matchday: 1 },
    { id: 7, date: "2026-06-13", time: "22:00", home: "HAI", away: "SCO", group: "C", venue: "boston", matchday: 1 },
    { id: 8, date: "2026-06-14", time: "01:00", home: "AUS", away: "TUR", group: "D", venue: "vancouver", matchday: 1 },
    { id: 9, date: "2026-06-14", time: "14:00", home: "GER", away: "CUR", group: "E", venue: "houston", matchday: 1 },
    { id: 10, date: "2026-06-14", time: "17:00", home: "NED", away: "JPN", group: "F", venue: "dallas", matchday: 1 },
    { id: 11, date: "2026-06-14", time: "20:00", home: "CIV", away: "ECU", group: "E", venue: "philadelphia", matchday: 1 },
    { id: 12, date: "2026-06-14", time: "23:00", home: "SWE", away: "TUN", group: "F", venue: "monterrey", matchday: 1 },
    { id: 13, date: "2026-06-15", time: "13:00", home: "ESP", away: "CPV", group: "H", venue: "atlanta", matchday: 1 },
    { id: 14, date: "2026-06-15", time: "16:00", home: "BEL", away: "EGY", group: "G", venue: "seattle", matchday: 1 },
    { id: 15, date: "2026-06-15", time: "19:00", home: "KSA", away: "URU", group: "H", venue: "miami", matchday: 1 },
    { id: 16, date: "2026-06-15", time: "22:00", home: "IRN", away: "NZL", group: "G", venue: "losAngeles", matchday: 1 },
    { id: 17, date: "2026-06-16", time: "16:00", home: "FRA", away: "SEN", group: "I", venue: "newYork", matchday: 1 },
    { id: 18, date: "2026-06-16", time: "19:00", home: "IRQ", away: "NOR", group: "I", venue: "boston", matchday: 1 },
    { id: 19, date: "2026-06-16", time: "22:00", home: "ARG", away: "ALG", group: "J", venue: "kansasCity", matchday: 1 },
    { id: 20, date: "2026-06-17", time: "01:00", home: "AUT", away: "JOR", group: "J", venue: "dallas", matchday: 1 },
    { id: 21, date: "2026-06-17", time: "14:00", home: "POR", away: "COD", group: "K", venue: "houston", matchday: 1 },
    { id: 22, date: "2026-06-17", time: "17:00", home: "ENG", away: "CRO", group: "L", venue: "dallas", matchday: 1 },
    { id: 23, date: "2026-06-17", time: "20:00", home: "GHA", away: "PAN", group: "L", venue: "toronto", matchday: 1 },
    { id: 24, date: "2026-06-17", time: "23:00", home: "UZB", away: "COL", group: "K", venue: "mexicoCity", matchday: 1 },

    // ======== JORNADA 2 ========
    { id: 25, date: "2026-06-18", time: "13:00", home: "CZE", away: "RSA", group: "A", venue: "atlanta", matchday: 2 },
    { id: 26, date: "2026-06-18", time: "16:00", home: "SUI", away: "BIH", group: "B", venue: "kansasCity", matchday: 2 },
    { id: 27, date: "2026-06-18", time: "19:00", home: "CAN", away: "QAT", group: "B", venue: "toronto", matchday: 2 },
    { id: 28, date: "2026-06-18", time: "22:00", home: "MEX", away: "KOR", group: "A", venue: "guadalajara", matchday: 2 },
    { id: 29, date: "2026-06-19", time: "16:00", home: "USA", away: "AUS", group: "D", venue: "philadelphia", matchday: 2 },
    { id: 30, date: "2026-06-19", time: "19:00", home: "SCO", away: "MAR", group: "C", venue: "boston", matchday: 2 },
    { id: 31, date: "2026-06-19", time: "21:30", home: "BRA", away: "HAI", group: "C", venue: "sanFrancisco", matchday: 2 },
    { id: 32, date: "2026-06-20", time: "00:00", home: "TUR", away: "PAR", group: "D", venue: "dallas", matchday: 2 },
    { id: 33, date: "2026-06-20", time: "14:00", home: "NED", away: "SWE", group: "F", venue: "seattle", matchday: 2 },
    { id: 34, date: "2026-06-20", time: "17:00", home: "GER", away: "CIV", group: "E", venue: "houston", matchday: 2 },
    { id: 35, date: "2026-06-20", time: "21:00", home: "ECU", away: "CUR", group: "E", venue: "monterrey", matchday: 2 },
    { id: 36, date: "2026-06-21", time: "01:00", home: "TUN", away: "JPN", group: "F", venue: "miami", matchday: 2 },
    { id: 37, date: "2026-06-21", time: "13:00", home: "ESP", away: "KSA", group: "H", venue: "atlanta", matchday: 2 },
    { id: 38, date: "2026-06-21", time: "16:00", home: "BEL", away: "IRN", group: "G", venue: "losAngeles", matchday: 2 },
    { id: 39, date: "2026-06-21", time: "19:00", home: "URU", away: "CPV", group: "H", venue: "miami", matchday: 2 },
    { id: 40, date: "2026-06-21", time: "22:00", home: "NZL", away: "EGY", group: "G", venue: "vancouver", matchday: 2 },
    { id: 41, date: "2026-06-22", time: "14:00", home: "ARG", away: "AUT", group: "J", venue: "miami", matchday: 2 },
    { id: 42, date: "2026-06-22", time: "18:00", home: "FRA", away: "IRQ", group: "I", venue: "philadelphia", matchday: 2 },
    { id: 43, date: "2026-06-22", time: "21:00", home: "NOR", away: "SEN", group: "I", venue: "newYork", matchday: 2 },
    { id: 44, date: "2026-06-23", time: "00:00", home: "JOR", away: "ALG", group: "J", venue: "losAngeles", matchday: 2 },
    { id: 45, date: "2026-06-23", time: "14:00", home: "POR", away: "UZB", group: "K", venue: "houston", matchday: 2 },
    { id: 46, date: "2026-06-23", time: "17:00", home: "ENG", away: "GHA", group: "L", venue: "boston", matchday: 2 },
    { id: 47, date: "2026-06-23", time: "20:00", home: "PAN", away: "CRO", group: "L", venue: "toronto", matchday: 2 },
    { id: 48, date: "2026-06-23", time: "23:00", home: "COL", away: "COD", group: "K", venue: "seattle", matchday: 2 },

    // ======== JORNADA 3 ========
    { id: 49, date: "2026-06-24", time: "16:00", home: "SUI", away: "CAN", group: "B", venue: "vancouver", matchday: 3 },
    { id: 50, date: "2026-06-24", time: "16:00", home: "BIH", away: "QAT", group: "B", venue: "kansasCity", matchday: 3 },
    { id: 51, date: "2026-06-24", time: "19:00", home: "MAR", away: "HAI", group: "C", venue: "atlanta", matchday: 3 },
    { id: 52, date: "2026-06-24", time: "19:00", home: "SCO", away: "BRA", group: "C", venue: "miami", matchday: 3 },
    { id: 53, date: "2026-06-24", time: "22:00", home: "RSA", away: "KOR", group: "A", venue: "monterrey", matchday: 3 },
    { id: 54, date: "2026-06-24", time: "22:00", home: "CZE", away: "MEX", group: "A", venue: "mexicoCity", matchday: 3 },
    { id: 55, date: "2026-06-25", time: "17:00", home: "CUR", away: "CIV", group: "E", venue: "monterrey", matchday: 3 },
    { id: 56, date: "2026-06-25", time: "17:00", home: "ECU", away: "GER", group: "E", venue: "newYork", matchday: 3 },
    { id: 57, date: "2026-06-25", time: "20:00", home: "TUN", away: "NED", group: "F", venue: "atlanta", matchday: 3 },
    { id: 58, date: "2026-06-25", time: "20:00", home: "JPN", away: "SWE", group: "F", venue: "philadelphia", matchday: 3 },
    { id: 59, date: "2026-06-25", time: "23:00", home: "TUR", away: "USA", group: "D", venue: "dallas", matchday: 3 },
    { id: 60, date: "2026-06-25", time: "23:00", home: "PAR", away: "AUS", group: "D", venue: "guadalajara", matchday: 3 },
    { id: 61, date: "2026-06-26", time: "16:00", home: "NOR", away: "FRA", group: "I", venue: "boston", matchday: 3 },
    { id: 62, date: "2026-06-26", time: "16:00", home: "SEN", away: "IRQ", group: "I", venue: "toronto", matchday: 3 },
    { id: 63, date: "2026-06-26", time: "21:00", home: "CPV", away: "KSA", group: "H", venue: "houston", matchday: 3 },
    { id: 64, date: "2026-06-26", time: "21:00", home: "URU", away: "ESP", group: "H", venue: "guadalajara", matchday: 3 },
    { id: 65, date: "2026-06-27", time: "00:00", home: "EGY", away: "IRN", group: "G", venue: "seattle", matchday: 3 },
    { id: 66, date: "2026-06-27", time: "00:00", home: "NZL", away: "BEL", group: "G", venue: "vancouver", matchday: 3 },
    { id: 67, date: "2026-06-27", time: "18:00", home: "PAN", away: "ENG", group: "L", venue: "newYork", matchday: 3 },
    { id: 68, date: "2026-06-27", time: "18:00", home: "CRO", away: "GHA", group: "L", venue: "philadelphia", matchday: 3 },
    { id: 69, date: "2026-06-27", time: "20:30", home: "COL", away: "POR", group: "K", venue: "miami", matchday: 3 },
    { id: 70, date: "2026-06-27", time: "20:30", home: "COD", away: "UZB", group: "K", venue: "atlanta", matchday: 3 },
    { id: 71, date: "2026-06-27", time: "23:00", home: "ALG", away: "AUT", group: "J", venue: "monterrey", matchday: 3 },
    { id: 72, date: "2026-06-27", time: "23:00", home: "JOR", away: "ARG", group: "J", venue: "dallas", matchday: 3 }
];

// =====================================================
// BRACKET ELIMINATORIO COMPLETO
// FIFA 2026: 1ro y 2do de cada grupo + 8 mejores 3ros = 32 equipos
// R32 → R16 → QF → SF → Final
// =====================================================
const KNOCKOUT_BRACKET = {
    r32: [
        // 1ros vs 2dos (cruces entre grupos pareados)
        { id: "R32-1", home: { group: "A", pos: 1 }, away: { group: "B", pos: 2 } },
        { id: "R32-2", home: { group: "C", pos: 1 }, away: { group: "D", pos: 2 } },
        { id: "R32-3", home: { group: "E", pos: 1 }, away: { group: "F", pos: 2 } },
        { id: "R32-4", home: { group: "G", pos: 1 }, away: { group: "H", pos: 2 } },
        { id: "R32-5", home: { group: "I", pos: 1 }, away: { group: "J", pos: 2 } },
        { id: "R32-6", home: { group: "K", pos: 1 }, away: { group: "L", pos: 2 } },
        { id: "R32-7", home: { group: "B", pos: 1 }, away: { group: "A", pos: 2 } },
        { id: "R32-8", home: { group: "D", pos: 1 }, away: { group: "C", pos: 2 } },
        { id: "R32-9", home: { group: "F", pos: 1 }, away: { group: "E", pos: 2 } },
        { id: "R32-10", home: { group: "H", pos: 1 }, away: { group: "G", pos: 2 } },
        { id: "R32-11", home: { group: "J", pos: 1 }, away: { group: "I", pos: 2 } },
        { id: "R32-12", home: { group: "L", pos: 1 }, away: { group: "K", pos: 2 } },
        // Mejores 3ros (rankeados: 1ro-mejor vs 8vo-mejor, etc.)
        { id: "R32-13", home: { bestThird: 1 }, away: { bestThird: 8 } },
        { id: "R32-14", home: { bestThird: 2 }, away: { bestThird: 7 } },
        { id: "R32-15", home: { bestThird: 3 }, away: { bestThird: 6 } },
        { id: "R32-16", home: { bestThird: 4 }, away: { bestThird: 5 } }
    ],
    r16: [
        { id: "R16-1", homeFrom: "R32-1", awayFrom: "R32-2" },
        { id: "R16-2", homeFrom: "R32-3", awayFrom: "R32-4" },
        { id: "R16-3", homeFrom: "R32-5", awayFrom: "R32-6" },
        { id: "R16-4", homeFrom: "R32-7", awayFrom: "R32-8" },
        { id: "R16-5", homeFrom: "R32-9", awayFrom: "R32-10" },
        { id: "R16-6", homeFrom: "R32-11", awayFrom: "R32-12" },
        { id: "R16-7", homeFrom: "R32-13", awayFrom: "R32-14" },
        { id: "R16-8", homeFrom: "R32-15", awayFrom: "R32-16" }
    ],
    qf: [
        { id: "QF-1", homeFrom: "R16-1", awayFrom: "R16-2" },
        { id: "QF-2", homeFrom: "R16-3", awayFrom: "R16-4" },
        { id: "QF-3", homeFrom: "R16-5", awayFrom: "R16-6" },
        { id: "QF-4", homeFrom: "R16-7", awayFrom: "R16-8" }
    ],
    sf: [
        { id: "SF-1", homeFrom: "QF-1", awayFrom: "QF-2" },
        { id: "SF-2", homeFrom: "QF-3", awayFrom: "QF-4" }
    ],
    final: [
        { id: "F-1", homeFrom: "SF-1", awayFrom: "SF-2" }
    ]
};

const ROUND_LABELS = {
    r32: '32avos de Final',
    r16: 'Octavos de Final',
    qf: 'Cuartos de Final',
    sf: 'Semifinales',
    final: 'Final'
};

// Empty results - edit manually as matches are played
const REAL_RESULTS = {};
