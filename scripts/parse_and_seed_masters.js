const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const usersData = [
  { name: "Aafrin", email: "aafrin@siddhivinayaklogistics.co.in", role: "OPERATIONS" },
  { name: "Dhruvee", email: "dhruvi@siddhivinayaklogistics.co.in", role: "QUOTATION" },
  { name: "Chirag", email: "chirag@siddhivinayaklogistics.co.in", role: "SALES" },
  { name: "Kamal", email: "kamal@siddhivinayaklogistics.co.in", role: "SALES" },
  { name: "Ankur", email: "ankur@siddhivinayaklogistics.co.in", role: "ADMIN" },
  { name: "Jinal", email: "jinal@siddhivinayaklogistics.co.in", role: "SALES" },
  { name: "Shrikar", email: "shrikar@siddhivinayaklogistics.co.in", role: "ADMIN" },
  { name: "Yash", email: "yash@siddhivinayaklogistics.co.in", role: "SALES" },
  { name: "Yogesh", email: "yogesh@siddhivinayaklogistics.co.in", role: "SALES" },
  { name: "Urvish", email: "urvish@siddhivinayaklogistics.co.in", role: "QUOTATION" },
  { name: "Devika", email: "devika@siddhivinayaklogistics.co.in", role: "FINANCE" },
];

const portsData = [
  { name: "Laem Chabang", code: "THLCH", country: "Thailand" },
  { name: "Bangkok", code: "THBKK", country: "Thailand" },
  { name: "Port Klang", code: "MYPKG", country: "Malaysia" },
  { name: "Tanjung Pelepas", code: "MYTPP", country: "Malaysia" },
  { name: "Tanjung Priok (Jakarta)", code: "IDTPP", country: "Indonesia" },
  { name: "Surabaya", code: "IDSUB", country: "Indonesia" },
  { name: "Manila", code: "PHMNL", country: "Philippines" },
  { name: "Cebu", code: "PHCEB", country: "Philippines" },
  { name: "Nhava Sheva (Jawaharlal Nehru Port)", code: "INNSA", country: "India" },
  { name: "Mumbai", code: "INBOM", country: "India" },
  { name: "Chennai", code: "INMAA", country: "India" },
  { name: "Mundra", code: "INMUN", country: "India" },
  { name: "Kolkata", code: "INCCU", country: "India" },
  { name: "Visakhapatnam", code: "INVTZ", country: "India" },
  { name: "Hazira", code: "INHZR", country: "India" },
  { name: "Pipavav", code: "INPAV", country: "India" },
  { name: "Cochin", code: "INCOK", country: "India" },
  { name: "Tuticorin", code: "INTUT", country: "India" },
  { name: "Chattogram", code: "BDCGP", country: "Bangladesh" },
  { name: "Karachi", code: "PKKHI", country: "Pakistan" },
  { name: "Port Qasim", code: "PKBQM", country: "Pakistan" },
  { name: "Colombo", code: "LKCMB", country: "Sri Lanka" },
  { name: "Yangon", code: "MMRGN", country: "Myanmar" },
  { name: "Sihanoukville", code: "KHSIH", country: "Cambodia" },
  { name: "Muara", code: "BNMUA", country: "Brunei" },
  { name: "Jebel Ali", code: "AEJEA", country: "United Arab Emirates" },
  { name: "Dubai", code: "AEDXB", country: "United Arab Emirates" },
  { name: "Khalifa Port (Abu Dhabi)", code: "AEAUH", country: "United Arab Emirates" },
  { name: "Jeddah", code: "SAJED", country: "Saudi Arabia" },
  { name: "Dammam", code: "SADMM", country: "Saudi Arabia" },
  { name: "Sohar", code: "OMSOH", country: "Oman" },
  { name: "Salalah", code: "OMSLL", country: "Oman" },
  { name: "Hamad Port", code: "QAHMD", country: "Qatar" },
  { name: "Shuwaikh", code: "KWSWK", country: "Kuwait" },
  { name: "Mina Salman", code: "BHMIN", country: "Bahrain" },
  { name: "Haifa", code: "ILHFA", country: "Israel" },
  { name: "Ashdod", code: "ILASH", country: "Israel" },
  { name: "Istanbul", code: "TRIST", country: "Turkey" },
  { name: "Izmir", code: "TRIZM", country: "Turkey" },
  { name: "Mersin", code: "TRMER", country: "Turkey" },
  { name: "Poti", code: "GEPTI", country: "Georgia" },
  { name: "Baku", code: "AZBAK", country: "Azerbaijan" },
  { name: "Rotterdam", code: "NLRTM", country: "Netherlands" },
  { name: "Amsterdam", code: "NLAMS", country: "Netherlands" },
  { name: "Antwerp", code: "BEANR", country: "Belgium" },
  { name: "Zeebrugge", code: "BEZEE", country: "Belgium" },
  { name: "Hamburg", code: "DEHAM", country: "Germany" },
  { name: "Bremerhaven", code: "DEBRV", country: "Germany" },
  { name: "Wilhelmshaven", code: "DEWVN", country: "Germany" },
  { name: "Le Havre", code: "FRLEH", country: "France" },
  { name: "Marseille", code: "FRMRS", country: "France" },
  { name: "Valencia", code: "ESVLC", country: "Spain" },
  { name: "Algeciras", code: "ESALG", country: "Spain" },
  { name: "Barcelona", code: "ESBCN", country: "Spain" },
  { name: "Bilbao", code: "ESBIO", country: "Spain" },
  { name: "Sines", code: "PTSIE", country: "Portugal" },
  { name: "Lisbon", code: "PTLIS", country: "Portugal" },
  { name: "Genoa", code: "ITGOA", country: "Italy" },
  { name: "Trieste", code: "ITTRS", country: "Italy" },
  { name: "Gioia Tauro", code: "ITGIT", country: "Italy" },
  { name: "La Spezia", code: "ITSPE", country: "Italy" },
  { name: "Piraeus", code: "GRPIR", country: "Greece" },
  { name: "Thessaloniki", code: "GRSKG", country: "Greece" },
  { name: "Valletta", code: "MTMLA", country: "Malta" },
  { name: "Koper", code: "SIKOP", country: "Slovenia" },
  { name: "Rijeka", code: "HRRJK", country: "Croatia" },
  { name: "Bar", code: "MEBAR", country: "Montenegro" },
  { name: "Durres", code: "ALDRZ", country: "Albania" },
  { name: "Constanta", code: "ROCND", country: "Romania" },
  { name: "Varna", code: "BGVAR", country: "Bulgaria" },
  { name: "Odesa", code: "UAODS", country: "Ukraine" },
  { name: "Gdansk", code: "PLGDN", country: "Poland" },
  { name: "Gdynia", code: "PLGDY", country: "Poland" },
  { name: "Klaipeda", code: "LTKLJ", country: "Lithuania" },
  { name: "Riga", code: "LVRIX", country: "Latvia" },
  { name: "Tallinn", code: "EETLL", country: "Estonia" },
  { name: "Helsinki", code: "FIHEL", country: "Finland" },
  { name: "Gothenburg", code: "SEGOT", country: "Sweden" },
  { name: "Oslo", code: "NOOSL", country: "Norway" },
  { name: "Aarhus", code: "DKAAR", country: "Denmark" },
  { name: "Reykjavik", code: "ISREY", country: "Iceland" },
  { name: "Felixstowe", code: "GBFXT", country: "United Kingdom" },
  { name: "London", code: "GBLON", country: "United Kingdom" },
  { name: "Southampton", code: "GBSOU", country: "United Kingdom" },
  { name: "Liverpool", code: "GBLIV", country: "United Kingdom" },
  { name: "Dublin", code: "IEDUB", country: "Ireland" },
  { name: "St Petersburg", code: "RULED", country: "Russia" },
  { name: "Novorossiysk", code: "RUNVS", country: "Russia" },
  { name: "Port Said", code: "EGPSD", country: "Egypt" },
  { name: "Alexandria", code: "EGALY", country: "Egypt" },
  { name: "Tangier Med", code: "MATNG", country: "Morocco" },
  { name: "Casablanca", code: "MACAS", country: "Morocco" },
  { name: "Algiers", code: "DZALG", country: "Algeria" },
  { name: "Rades", code: "TNRAD", country: "Tunisia" },
  { name: "Tripoli", code: "LYTIP", country: "Libya" },
  { name: "Durban", code: "ZADUR", country: "South Africa" },
  { name: "Cape Town", code: "ZACPT", country: "South Africa" },
  { name: "Ngqura", code: "ZANGQ", country: "South Africa" },
  { name: "Port Elizabeth", code: "ZAPLZ", country: "South Africa" },
  { name: "Walvis Bay", code: "NAWVB", country: "Namibia" },
  { name: "Luanda", code: "AOLAD", country: "Angola" },
  { name: "Pointe-Noire", code: "CGPNR", country: "Congo" },
  { name: "Matadi", code: "CDMAT", country: "DR Congo" },
  { name: "Libreville", code: "GALBV", country: "Gabon" },
  { name: "Douala", code: "CMDLA", country: "Cameroon" },
  { name: "Lagos", code: "NGLOS", country: "Nigeria" },
  { name: "Onne", code: "NGONN", country: "Nigeria" },
  { name: "Tema", code: "GHTEM", country: "Ghana" },
  { name: "Abidjan", code: "CIABJ", country: "Cote d'Ivoire" },
  { name: "Dakar", code: "SNDKR", country: "Senegal" },
  { name: "Nouakchott", code: "MRNKC", country: "Mauritania" },
  { name: "Mombasa", code: "KEMBA", country: "Kenya" },
  { name: "Dar es Salaam", code: "TZDAR", country: "Tanzania" },
  { name: "Maputo", code: "MZMPM", country: "Mozambique" },
  { name: "Toamasina", code: "MGTOA", country: "Madagascar" },
  { name: "Port Louis", code: "MUPLU", country: "Mauritius" },
  { name: "Port Victoria", code: "SCPRV", country: "Seychelles" },
  { name: "Djibouti", code: "DJJIB", country: "Djibouti" },
  { name: "Berbera", code: "SOBBO", country: "Somalia" },
  { name: "Massawa", code: "ERMSS", country: "Eritrea" },
  { name: "Los Angeles", code: "USLAX", country: "United States" },
  { name: "Long Beach", code: "USLGB", country: "United States" },
  { name: "New York", code: "USNYC", country: "United States" },
  { name: "Newark", code: "USNWK", country: "United States" },
  { name: "Savannah", code: "USSAV", country: "United States" },
  { name: "Houston", code: "USHOU", country: "United States" },
  { name: "Charleston", code: "USCHS", country: "United States" },
  { name: "Norfolk", code: "USORF", country: "United States" },
  { name: "Oakland", code: "USOAK", country: "United States" },
  { name: "Seattle", code: "USSEA", country: "United States" },
  { name: "Tacoma", code: "USTIW", country: "United States" },
  { name: "Miami", code: "USMIA", country: "United States" },
  { name: "New Orleans", code: "USMSY", country: "United States" },
  { name: "Baltimore", code: "USBAL", country: "United States" },
  { name: "Philadelphia", code: "USPHL", country: "United States" },
  { name: "Vancouver", code: "CAVAN", country: "Canada" },
  { name: "Montreal", code: "CAMTR", country: "Canada" },
  { name: "Halifax", code: "CAHAL", country: "Canada" },
  { name: "Prince Rupert", code: "CAPRR", country: "Canada" },
  { name: "Saint John", code: "CASJB", country: "Canada" },
  { name: "Manzanillo", code: "MXZLO", country: "Mexico" },
  { name: "Lazaro Cardenas", code: "MXLZC", country: "Mexico" },
  { name: "Veracruz", code: "MXVER", country: "Mexico" },
  { name: "Altamira", code: "MXATM", country: "Mexico" },
  { name: "Balboa", code: "PABLB", country: "Panama" },
  { name: "Cristobal", code: "PACTB", country: "Panama" },
  { name: "Limon", code: "CRLIO", country: "Costa Rica" },
  { name: "Puerto Quetzal", code: "GTPRQ", country: "Guatemala" },
  { name: "Puerto Cortes", code: "HNPCR", country: "Honduras" },
  { name: "Acajutla", code: "SVAQJ", country: "El Salvador" },
  { name: "Corinto", code: "NICIO", country: "Nicaragua" },
  { name: "Kingston", code: "JMKIN", country: "Jamaica" },
  { name: "Caucedo", code: "DOCAU", country: "Dominican Republic" },
  { name: "Santo Domingo", code: "DOSDQ", country: "Dominican Republic" },
  { name: "Freeport", code: "BSFPO", country: "Bahamas" },
  { name: "Port of Spain", code: "TTPTS", country: "Trinidad and Tobago" },
  { name: "Havana", code: "CUHAV", country: "Cuba" },
  { name: "Port-au-Prince", code: "HTPAP", country: "Haiti" },
  { name: "Santos", code: "BRSSZ", country: "Brazil" },
  { name: "Rio de Janeiro", code: "BRRIO", country: "Brazil" },
  { name: "Paranagua", code: "BRPNG", country: "Brazil" },
  { name: "Itajai", code: "BRITJ", country: "Brazil" },
  { name: "Buenos Aires", code: "ARBUE", country: "Argentina" },
  { name: "Rosario", code: "ARROS", country: "Argentina" },
  { name: "Montevideo", code: "UYMVD", country: "Uruguay" },
  { name: "Valparaiso", code: "CLVAP", country: "Chile" },
  { name: "San Antonio", code: "CLSAI", country: "Chile" },
  { name: "Callao", code: "PECLL", country: "Peru" },
  { name: "Guayaquil", code: "ECGYE", country: "Ecuador" },
  { name: "Cartagena", code: "COCTG", country: "Colombia" },
  { name: "Buenaventura", code: "COBUN", country: "Colombia" },
  { name: "Puerto Cabello", code: "VEPBL", country: "Venezuela" },
  { name: "Georgetown", code: "GYGEO", country: "Guyana" },
  { name: "Paramaribo", code: "SRPBM", country: "Suriname" },
  { name: "Cayenne", code: "GFCAY", country: "French Guiana" },
  { name: "Melbourne", code: "AUMEL", country: "Australia" },
  { name: "Sydney", code: "AUSYD", country: "Australia" },
  { name: "Brisbane", code: "AUBNE", country: "Australia" },
  { name: "Fremantle", code: "AUFRE", country: "Australia" },
  { name: "Port Botany", code: "AUPBQ", country: "Australia" },
  { name: "Adelaide", code: "AUADL", country: "Australia" },
  { name: "Auckland", code: "NZAKL", country: "New Zealand" },
  { name: "Tauranga", code: "NZTRG", country: "New Zealand" },
  { name: "Wellington", code: "NZWLG", country: "New Zealand" },
  { name: "Lyttelton", code: "NZLYT", country: "New Zealand" },
  { name: "Port Moresby", code: "PGPOM", country: "Papua New Guinea" },
  { name: "Suva", code: "FJSUV", country: "Fiji" },
  { name: "Noumea", code: "NCNOU", country: "New Caledonia" },
  { name: "Apia", code: "WSAPW", country: "Samoa" },
  { name: "Nuku'alofa", code: "TOTBU", country: "Tonga" },
  { name: "Honiara", code: "SBHIR", country: "Solomon Islands" },
];

const shippingLines = [
  { name: "LIVRO SHIPPING", contactPerson: "Yuvraj", email: "yuvraj@livroshipping.com", phone: "+91 6358923981", address: "Mundra / Nhava Sheva" },
  { name: "UNIFEEDER", contactPerson: "Jatin Ahuja", email: "jatin.ahuja@unifeeder.com", phone: "+91 9725087456", address: "Mundra / Hazira" },
  { name: "ENTRUST SHIPPING", contactPerson: "Sohail", email: "sales1.mum@entrustshipping.com", phone: "+91 8655956519", address: "Mundra / Nhava Sheva" },
  { name: "EMIRATES SHIPPING LINE", contactPerson: "Kuldipsinh Rathod", email: "kuldipsinh.rathod@in.emiratesline.com", phone: "+91 8980025090", address: "Mundra" },
  { name: "T S LINES", contactPerson: "Sunilkumar Chauhan", email: "sunilkumar.chauhan@tslineindia.com", phone: "+91 9870028624", address: "Mundra / Nhava Sheva" },
  { name: "WINASIA MARITIME", contactPerson: "Pratik", email: "export@winasiamaritime.com", phone: "+91 7572800059", address: "Mundra / Kandla / Nhava Sheva" },
  { name: "WINWIN MARITIME", contactPerson: "Paresh Ravatiya", email: "mktg1@winwinmaritime.com", phone: "+91 7575800686", address: "Mundra / Ahmedabad" },
  { name: "COSCO SHIPPING LINES", contactPerson: "Harsh Soni", email: "harsh.soni@coscon.com", phone: "+91 9601644244", address: "Mundra / Mumbai" },
  { name: "OCEAN NETWORK EXPRESS (ONE)", contactPerson: "Harsh Yagnik", email: "harsh.yagnik@one-line.com", phone: "+91 9727743879", address: "Mundra / Hazira / Nhava Sheva" },
  { name: "FCIPL", contactPerson: "Vikas Patel", email: "vikas@fcipl.com", phone: "+91 9426970910", address: "Mundra / Ahmedabad" },
  { name: "YANG MING LINE (YML)", contactPerson: "Tejas", email: "tejas@yml.in", phone: "+91 9913242636", address: "Mundra / Nhava Sheva" },
  { name: "AEGON SHIPPING", contactPerson: "Paresh", email: "sales.inmun@aegonshipping.com", phone: "+91 8356891150", address: "Mundra / Nhava Sheva" },
  { name: "CORDELIA CONTAINER LINE", contactPerson: "Hitesh Tarani", email: "hitesh.tarani@cordelialine.com", phone: "+91 9601801894", address: "Mundra / Nhava Sheva / Cochin" },
  { name: "UNITED LINER AGENCIES", contactPerson: "Abhijit Das", email: "abhijitd@unitedliners.com", phone: "+91 9434020163", address: "Mundra / Kandla" },
  { name: "CAPE OCEAN SHIPPING", contactPerson: "Shivam Tiwari", email: "sales.mun@capeoceanshipping.com", phone: "+91 9662088866", address: "Mundra" },
  { name: "EMINENT SHIPPING", contactPerson: "Ravin Paul", email: "ravin.paul@eminentshipping.com", phone: "+91 9638259879", address: "Mundra / Chennai" },
  { name: "AIYER SHIPPING", contactPerson: "Sudhakar", email: "sudhakar@aiyershipping.com", phone: "+91 9825283474", address: "Mundra / Nhava Sheva" },
  { name: "BLUE MARLIN SHIPPING", contactPerson: "Naina / Chirag", email: "naina@bluemarlinshipping.com", phone: "+91 9898844773", address: "Mundra / Nhava Sheva" },
  { name: "TRANSVISION SHIPPING", contactPerson: "Ziauddin", email: "ziauddin@transvisionshipping.com", phone: "+91 9136921480", address: "Mundra / Pipavav" },
  { name: "OOCL (ORIENT OVERSEAS CONTAINER LINE)", contactPerson: "Jigar Veera", email: "jigar.veera@oocl.com", phone: "+91 9967774567", address: "Mundra / Nhava Sheva / Bangalore" },
  { name: "EVERGREEN LINE", contactPerson: "Amit Darekar", email: "amitdarekar@evergreen-shipping.co.in", phone: "+91 9833220620", address: "Mundra / Nhava Sheva" },
  { name: "MONTER GLOBAL LINE", contactPerson: "Tanuj Pradhan", email: "mun.cs@monterglobal.com", phone: "+91 8200506613", address: "Mundra / Kandla / Pipavav" },
  { name: "PIL (PACIFIC INTERNATIONAL LINES)", contactPerson: "Ganesh Iyer", email: "ganesh.v@inmun.pilship.com", phone: "+91 7200098670", address: "Mundra / Chennai / Hazira" },
  { name: "HUB & LINKS (HUBLINK)", contactPerson: "Arun John", email: "mktg1.kandla@hublinksindia.com", phone: "+91 9727714184", address: "Mundra / Kandla / Cochin" },
  { name: "SINOKOR MERCHANT MARINE", contactPerson: "Rajnish Kumar", email: "rajnishk@sinokor.co.in", phone: "+91 9022660919", address: "Mundra / Nhava Sheva" },
  { name: "MSC (MEDITERRANEAN SHIPPING COMPANY)", contactPerson: "Rakesh P", email: "rakesh.p@msc.com", phone: "+91 6357009928", address: "Mundra / Mumbai / Nhava Sheva" },
  { name: "ZIM INTEGRATED SHIPPING", contactPerson: "Niraj Raval", email: "raval.niraj@zim.com", phone: "+91 9687650676", address: "Mundra / Nhava Sheva" },
  { name: "BLUE WATER LINES (ABRAO GROUP)", contactPerson: "Ketan Lagoo", email: "ketan_lagoo@abraogroup.com", phone: "+91 8238805900", address: "Mundra / Nhava Sheva" },
  { name: "INTERASIA LINES", contactPerson: "Karan Ahuja", email: "karan.ahuja@interasialine.com", phone: "+91 7990537174", address: "Mundra / Nhava Sheva" },
  { name: "SAMUDERA SHIPPING LINE", contactPerson: "Onkar Mhatre", email: "onkar.mhatre@samudera.id", phone: "+91 9869975299", address: "Mundra / Nhava Sheva" },
  { name: "GOODRICH LOGISTICS", contactPerson: "Leena / Jyoti", email: "leena@goodrichindia.com", phone: "+91 9099996070", address: "Mundra / Gandhidham" },
  { name: "EKMTC (KOREA MARINE TRANSPORT)", contactPerson: "Varun Thacker", email: "varun@ekmtc.com", phone: "+91 9833453709", address: "Mundra / Nhava Sheva" },
  { name: "SAMSARA SHIPPING", contactPerson: "Yatin Pitroda", email: "yatin.pitroda@oasisshipping.com", phone: "+91 9819429629", address: "Mundra / Nhava Sheva" },
  { name: "HMM (HYUNDAI MERCHANT MARINE)", contactPerson: "Binit", email: "binit@hmm21.com", phone: "+91 9979777080", address: "Mundra / Bangalore" },
  { name: "RADIANT MARITIME", contactPerson: "Vinod Nair", email: "vinod@radiant-india.net", phone: "+91 8879648232", address: "Mundra / China" },
  { name: "ALADIN EXPRESS (ALX)", contactPerson: "Dhaval Thacker", email: "dhaval.thacker@aladinxp.co.in", phone: "+91 9825244048", address: "Mundra / Nhava Sheva" },
  { name: "NOBLE SHIPPING", contactPerson: "Joy Christian", email: "ahd@nobleshipping.net", phone: "+91 9824089608", address: "Ahmedabad / Nhava Sheva" },
  { name: "DAHNAY LINES", contactPerson: "Yash", email: "mun.yash@dahnaylines.com", phone: "+91 8925117333", address: "Mundra / Hazira / Pipavav" },
  { name: "ECON SHIPPING", contactPerson: "Aishwarya Shettigar", email: "aishwarya@econshipping.com", phone: "+91 8879985247", address: "Mundra / Nhava Sheva / Tuticorin" },
  { name: "NAVIO SHIPPING", contactPerson: "Jyotin", email: "jyotin.mun@navio-shipping.com", phone: "+91 8758955553", address: "Mundra / Nhava Sheva" },
  { name: "DEMCO CONTAINER LINE", contactPerson: "Akshay", email: "akshay@demcocontainerline.com", phone: "+91 7208843212", address: "Mundra / Nhava Sheva" },
  { name: "LENSAR (KMS MARITIME)", contactPerson: "Mohit", email: "sales.mun@kmsmaritime.com", phone: "+91 9313156158", address: "Mundra / Jebel Ali" },
  { name: "SUPREME CONTAINER LINES", contactPerson: "Sachin", email: "docs1@sclines.co.in", phone: null, address: "Mundra / Nhava Sheva" },
  { name: "ARMITA INDIA", contactPerson: "Prateek / Omprakash", email: "marketing1@armitaindia.com", phone: "+91 9769141214", address: "Mundra / Bandar Abbas" },
  { name: "SAFEWATER LINE", contactPerson: "Pawan Malpani", email: "pawan@aquaroute.in", phone: "+91 8058215841", address: "Mundra / Mumbai" },
  { name: "XTRANS", contactPerson: "Zara / Janki", email: "cs4.nsa@xtrans.in", phone: "+91 9967262507", address: "Mundra / Nhava Sheva" },
  { name: "INOX SHIPPING", contactPerson: "Marimuthu", email: "marimuthu@inoxshipping.com", phone: "+91 8655871758", address: "Mundra" },
  { name: "RCL (REGIONAL CONTAINER LINES)", contactPerson: "Dev / Shailesh", email: "rclindia@seatradeshipping.com", phone: "+91 9737851742", address: "Mundra / Mumbai / Nhava Sheva" },
  { name: "WINOCEAN MARITIME", contactPerson: "Sajitha / John", email: "csmundra@winocean.in", phone: "+91 7575801172", address: "Mundra / Nhava Sheva" },
  { name: "SEA LEAD SHIPPING", contactPerson: "Rahul Pandey", email: "rahul.pandey@sea-lead.com", phone: "+91 9561398277", address: "Mundra / Nhava Sheva" },
  { name: "DECCAN TRANS", contactPerson: "Kuldeep / Dakshesh", email: "kuldeep@deccantrans.com", phone: "+91 8369913669", address: "Mundra / Nhava Sheva" },
  { name: "ARKAS LINE", contactPerson: "Kshitij P", email: "kshitij.p@pmapl.com", phone: "+91 9574325531", address: "Mundra / Ahmedabad" },
  { name: "SEAGOLD LOGISTICS", contactPerson: "Kuldeep", email: "bm.mundra@seagoldlog.com", phone: "+91 9833866885", address: "Mundra / Nhava Sheva" },
  { name: "GOLD STAR LINE", contactPerson: "Himanshu Vala", email: null, phone: "+91 9099971311", address: "Ahmedabad" },
  { name: "X-PRESS FEEDERS", contactPerson: "Monika / Vinodkumar", email: "enquiry.asia@x-pressfeeders.com", phone: "+91 2227240072", address: "Mumbai / Kolkata / Cochin" },
  { name: "SEAKING SHIPPING", contactPerson: "Shahnawaz / Mehfuz", email: "seapricing@seakingshipping.com", phone: "+91 8097290578", address: "Nhava Sheva" },
  { name: "WAN HAI LINES", contactPerson: "Shakti / Varun / Anil", email: "shakti_p@wanhai.com", phone: "+91 7574879742", address: "Mundra / Nhava Sheva" },
  { name: "CMA CGM", contactPerson: "Tanay Joshi", email: "amd.tjoshi@cma-cgm.com", phone: "+91 8169463105", address: "Ahmedabad / Mumbai" },
  { name: "ALLCARGO LOGISTICS", contactPerson: "Rahul Akolkar", email: "rahul.akolkar@allcargologistics.com", phone: "+91 7288905438", address: "Mundra / Mumbai" },
  { name: "SEACON SHIPPING", contactPerson: "Amit", email: "amit@ssl-india.com", phone: "+91 9726244422", address: "Mundra" },
  { name: "MAERSK LINE", contactPerson: "Sales Desk", email: "in.sales@maersk.com", phone: "+91 2266528000", address: "All India Ports" },
  { name: "HAPAG-LLOYD", contactPerson: "Customer Service", email: "india@hlag.com", phone: "+91 2261986000", address: "All India Ports" },
];

function getPermissions(role) {
  const isAll = role === "ADMIN";
  const isSales = role.includes("SALES");
  const isQuote = role.includes("QUOTATION");
  const isOps = role.includes("OPERATIONS");
  const isFin = role.includes("FINANCE");
  return JSON.stringify({
    dashboard: { view: true, add: false, edit: false, delete: false },
    inquiries: { view: isAll || isSales, add: isAll || isSales, edit: isAll || isSales, delete: isAll },
    quotations: { view: isAll || isSales || isQuote, add: isAll || isSales || isQuote, edit: isAll || isSales || isQuote, delete: isAll },
    jobs: { view: isAll || isOps || isSales, add: isAll || isOps, edit: isAll || isOps, delete: isAll },
    dailyStatus: { view: isAll || isOps || isSales, add: isAll || isOps, edit: isAll || isOps, delete: isAll },
    finance: { view: isAll || isFin, add: isAll || isFin, edit: isAll || isFin, delete: isAll },
    hr: { view: isAll, add: isAll, edit: isAll, delete: isAll },
    reports: { view: isAll || isSales || isFin, add: false, edit: false, delete: false },
    masters: { view: true, add: isAll, edit: isAll, delete: isAll },
    users: { view: isAll, add: isAll, edit: isAll, delete: isAll },
  });
}

async function main() {
  console.log("=========================================");
  console.log("  COMPREHENSIVE MASTER DATA SEEDING      ");
  console.log("=========================================");

  // 1. Ports
  console.log("1. Seeding Ports (" + portsData.length + " ports)...");
  for (const p of portsData) {
    await prisma.port.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }
  console.log("   ✓ Seeded " + portsData.length + " Global & Indian Ports.");

  // 2. Shipping Lines
  console.log("2. Seeding Shipping Lines (" + shippingLines.length + " liners)...");
  for (const l of shippingLines) {
    await prisma.liner.upsert({
      where: { name: l.name },
      update: l,
      create: l,
    });
  }
  console.log("   ✓ Seeded " + shippingLines.length + " Shipping Lines.");

  // 3. Forwarders
  console.log("3. Seeding Forwarders...");
  await prisma.overseasAgent.upsert({
    where: { name: "TOTAL TRANSPORT PVT LTD" },
    update: { name: "TOTAL TRANSPORT PVT LTD", country: "INDIA", contactPerson: "OM BHANUSALI" },
    create: { name: "TOTAL TRANSPORT PVT LTD", country: "INDIA", contactPerson: "OM BHANUSALI" },
  });
  console.log("   ✓ Seeded Forwarders.");

  // 4. Transporters
  console.log("4. Seeding Transporters...");
  await prisma.transporter.upsert({
    where: { name: "G M TRANSPORT" },
    update: { name: "G M TRANSPORT", contactPerson: "SANJAY", phone: "9702031009", country: "INDIA", address: "MUMBAI" },
    create: { name: "G M TRANSPORT", contactPerson: "SANJAY", phone: "9702031009", country: "INDIA", address: "MUMBAI" },
  });
  console.log("   ✓ Seeded Transporters.");

  // 5. Users & Logins
  console.log("5. Seeding Team Users (" + usersData.length + " users)...");
  const defaultUserPass = await bcrypt.hash("svil@2026", 10);

  for (const u of usersData) {
    const perms = getPermissions(u.role);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        permissions: perms,
        status: "ACTIVE",
      },
      create: {
        name: u.name,
        email: u.email,
        password: defaultUserPass,
        role: u.role,
        permissions: perms,
        status: "ACTIVE",
      },
    });
    console.log(`   + User: ${u.name} (${u.email}) [${u.role}]`);
  }

  // Master Admin
  const adminPass = await bcrypt.hash("admin@svil2026", 10);
  const adminPerms = getPermissions("ADMIN");
  await prisma.user.upsert({
    where: { email: "admin@svil.com" },
    update: {
      name: "Administrator",
      role: "ADMIN",
      password: adminPass,
      permissions: adminPerms,
      status: "ACTIVE",
    },
    create: {
      email: "admin@svil.com",
      name: "Administrator",
      role: "ADMIN",
      password: adminPass,
      permissions: adminPerms,
      status: "ACTIVE",
    },
  });
  console.log("   ✓ Master Admin active: admin@svil.com");

  console.log("=========================================");
  console.log("  MASTER DATA SEEDING COMPLETE!          ");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("Master Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
