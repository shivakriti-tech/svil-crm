import sqlite3
import bcrypt
import json
import re

raw_data = """
Shipping LINE NAME,PERSON NAME,EMAIL ID,MO.NO.,SECTOR,LOCATION,Country,Address,Liner Code
LIVRO,YUVRAJ,Yuvraj GDM Livro Shipping yuvraj@livroshipping.com,63 5892 3981,GULF,MUNDRA,,,
UNIFEEDER,JATIN,jatin.ahuja@unifeeder.com,9725087456,GULF,MUNDRA,,,
ENTRUST,SOHAIL,Sohail - Entrust sales1.mum@entrustshipping.com,86559 56519,GULF,MUNDRA,,,
EMIRATES,KULDIP,Kuldipsinh Rathod Kuldipsinh.Rathod@in.emiratesline.com,89800 25090,GULF,MUNDRA,,,
T S LINE,SUNIL,Sunilkumar Chauhan - TSL India sunilkumar.chauhan@tslineindia.com,9870028624,GULF,MUNDRA,,,
WINASIA,JYOTIN,mktg1@winasiamaritime.com – JYOTIN,7572800066,GULF,MUNDRA,JYOTIN LEFT WINASIA,,
WINWIN,PARESH,Paresh Ravatiya mktg1@winwinmaritime.com,7575800686,GULF,MUNDRA,,,
COSCO,HARSH,sonihar/Harsh Soni(India/Mundra) Harsh.Soni@coscon.com,96016 44244,GULF,MUNDRA,SATURDAY OFF,,
ONELINE,HARSH,harsh.yagnik@one-line.com,9727743879,GULF,MUNDRA,SATURDAY OFF,,
FCIPL,VIKAS,vikas@fcipl.com,9426970910,GULF,MUNDRA,,,
YML,TEJAS,YM-MUN-MKT Tejas (tejas@yml.in),9913242636,GULF,MUNDRA,,,
AEGON,PARESH,Paresh Aegon Shipping sales.inmun@aegonshipping.com,8356891150 / 8511111600,GULF,MUNDRA,,,
CORDELIA,HITESH,Hitesh.tarani@cordelialine.com,96018 01894,GULF,MUNDRA,,,
UNITED LINER,ABHIJIT,Capt A.K.Das abhijitd@unitedliners.com,9434020163,GULF,MUNDRA,,,
CAPEOCEANSHIPPING,SHIVAM,SHIVAM TIWARI | CAPEOCEANSHIPPING <sales.mun@capeoceanshipping.com>,9662088866 / +91 6359999344,GULF/JEDDAH/SOKHNA/CHITTAGONG,MUNDRA,SATURDAY OFF,,
EMINENT,RAVIN,ravin.paul@eminentshipping.com,9638259879,GULF,MUNDRA,SATURDAY OFF,,
AIYER,SUDHAKAR,sudhakar@aiyershipping.com,9825283474,GULF,MUNDRA,,,
BLUEMARLIN,NAINA/CHIRAG,Naina naina@bluemarlinshipping.com,9898844773 - NAINA,GULF,MUNDRA,,,
TRANSVISION,ZIAUDDIN,Ziauddin - Transvision <ziauddin@transvisionshipping.com>,9136921480,GULF,MUNDRA,,,
OOCL,JIGAR/JAGDISH,jigar.veera@oocl.com,9967774567 - JIGAR,GULF,MUNDRA,,,
EVERGREEN,AMIT,AMIT DAREKAR <amitdarekar@evergreen-shipping.co.in>,9833220620,ASIA,MUNDRA,,,
monterglobal line,MONTREAL,gopal.mun@monterglobal.com - kandla n mundra,,,MUNDRA,,,
WINASIA,PRATIK,export@winasiamaritime.com – PRATIK,7572800059,GULF/COLOMBO/BANDARABBAS/CHITTAGONG,MUNDRA/KANDLA,,,
EVERGREEN,SANTOS,SANTOSH GOGARKAR <sgogarkar@evergreen-shipping.co.in>,9833073652,,MUNDRA,,,
PIL,GANESH,Ganesh Iyer <ganesh.v@inmun.pilship.com>,7200098670,ASIA,MUNDRA,,,
HUBLINK,ARUN,Arun John--HUB & LINKS' <mktg1.kandla@hublinksindia.com>,9727714184,NOVOROSSIYSK & SAINT PETERSBURG,MUNDRA,,,
SINOKOR,RAJNISH,rajnishk@sinokor.co.in,9022660919,GULF,MUNDRA,,,
MSC,RAKESH,rakesh.p@msc.com,6357009928,,MUNDRA,,,
SHAL.ASIA,ABHIJIT,Abhijeet Nair <DocMun@shal.asia>,,,MUNDRA,,,
ZIM,Niraj Raval,Raval Niraj <Raval.Niraj@zim.com>,96876 50676,,MUNDRA,,,
BLUE WATER,KETAN,ketan_lagoo@abraogroup.com,82388 05900,,MUNDRA,,,
INTERASIA,KARAN,Karan Ahuja / IAL MUNDRA' <karan.ahuja@interasialine.com>,7990537174,BUSAN,MUNDRA,,,
Samudera Shipping Line,ONKAR,Onkar Mhatre' <onkar.mhatre@samudera.id>,9869975299,,MUNDRA,,,
EMIRATES,EMIRATES,Inmun.sales@in.emiratesline.com,,,MUNDRA,,,
EMIRATES,LUV,Luv Rupani <Luv.Rupani@in.emiratesline.com>,,,MUNDRA,,,
MSC,NAVDEEP,Navdeep.sharma@msc.com',,,MUNDRA,,,
GOODRICH,LEENA,Leena <leena@goodrichindia.com>,,,MUNDRA,,,
GOODRICH LOGISTIC,JYOTI,Jyoti <exports.gandhidham@goodrichlogistics.com>,,,MUNDRA,,,
GOODRICH LOGISTIC,SURYA PRAKASH,spmishra@goodrichlogistics.com,#ERROR!,ADEN,MUNDRA,,,
EKMTC,VARUN,Varun Thacker IN GDM <varun@ekmtc.com>,,,MUNDRA,,,
AEGON,HARSHITA YADAV,Harshita Yadav <support.inmun@aegonshipping.com>,,,MUNDRA,,,
SAMSARA,yatin,yatin.pitroda@oasisshipping.com',#ERROR!,BUSAN,MUNDRA,,,
HMM,BINIT,binit@hmm21.com,,BUSAN,MUNDRA,,,
RADIANT,VINOD,Vinod Nair <vinod@radiant-india.net>,,SHANGHAI/NINGBO/JEBEL ALI/PKL/SIN/SHUWAIKH,MUNDRA,,,
ALX,DHAVAL,Dhaval Thacker <dhaval.thacker@aladinxp.co.in>,98252 44048,GULF,MUNDRA,,,
WINASIA,KAMLESH,mktg2@winasiamaritime.com,7698656672 / 7572800177,GULF,MUNDRA,,,
NOBLE,JOY,Joy Christian' <ahd@nobleshipping.net>,,CANADA/USA,NHAVA SHEVA/MUNDRA,,,
CORDELIA,HITESH,Hitesh Tarani - Cordelia <hitesh.tarani@cordelialine.com>,,GULF,MUNDRA,,,
DAHNAY,YASH,mun.yash@dahnaylines.com',,,MUNDRA,,,
ECON,AISHWARYA,Aishwarya Shettigar <aishwarya@econshipping.com>,,,MUNDRA,,,
NAVIO,JYOTIN,jyotin.mun@navio-shipping.com,8758955553,,MUNDRA,,,
CORDELIA,RAJEESH,Rajeesh Nair - Cordelia <rajeesh.nair@cordelialine.com>,,,MUNDRA,,,
OASIS,PRIYANKA,Priyanka Kamble - Oasis <priyanka.kamble@oasisshipping.com>,,,MUNDRA,,,
DEMCO,AKSHAY,akshay@demcocontainerline.com,72088 43212,,MUNDRA,,,
LENSAR,MOHIT,sales.mun@kmsmaritime.com,93131 56158,JEBEL ALI/JEDDAH,MUNDRA,,,
SUPREME,SACHIN,Sachin <docs1@sclines.co.in>,,,MUNDRA,,,
WINASIA,BHUPENDRA,Bhupendra Sharma <mktg@winasiamaritime.com>,,,MUNDRA,,,
TS,RIYA,riya.gianchandani@tslineindia.com,8980159898,HONGKONG/KOREA/JAPAN /CHINA /SINGAPORE/MALAYSIA/PHILIPINES/TAIWAN/AUSTRALIA/JEDDAH,MUNDRA,,,
ARMITA,OMPRAKASH,commgdm1@armitaindia.com,99797 77030,BANDAR ABBAS,MUNDRA,,,
WIN - LINES,SURESH PUKKALLA,bdm.mun@win-lines.com,8925974986,,MUNDRA,,,
SAFEWATER,PAWAN MALPANI,Pawan Malpani - AquaRoute <pawan@aquaroute.in>,8058215841,,MUNDRA,,,
FCIPL,BRIJESH,Brijesh Ahuja <brijesh@fcipl.com>,,,MUNDRA,,,
FCIPL,YASH,Yash Ravatiya <yash.ravatiya@fcipl.com>,,,MUNDRA,,,
ARMITA,PRATEEK,marketing1@armitaindia.com,9769141214,BANDAR ABBAS,MUNDRA,,,
ECON,YOGESH,Yogesh Ruhatiya <yogesh@econshipping.com>,97692 90702,,MUNDRA,,,
ONELINE,SALES,in.gin.sales@one-line.com,,,MUNDRA,,,
XTRANS,ZARA,cs4.nsa@xtrans.in,99672 62507,JEA / BND / KHI / JEDDAH / SOHAR/ NINGBO / HAIPONG / SHANGHAI / ADEN / AQABA / PORT SUDAN,MUNDRA,,,
FOLKTIME,VICKY,vicky.b@seastarglobal.in,,,MUNDRA,,,
XTRANS,JANKI,cs4.nsa@xtrans.in,99672 62507,JEA / BND / KHI / JEDDAH / SOHAR/ NINGBO / HAIPONG / SHANGHAI / ADEN / AQABA / PORT SUDAN,MUNDRA,,,
INOX SHIPPING,MARIMUTHU,marimuthu@inoxshipping.com,86558 71758,,MUNDRA,,,
KMS MARITIME,MR JAY BELLANI,sales.mun@kmsmaritime.com,9825287630,,MUNDRA,,,
KMS MARITIME,Ms. Tanya,csu@kmsmaritime.com,,,MUNDRA,,,
RCL,DEV,,97378 51742,,MUNDRA,,,
MONTER SHIPPING,TANUJ PRADHAN,mun.cs@monterglobal.com,02836 231300 / 231500,,MUNDRA,,,
MONTER SHIPPING,Mr Vinayak Anandani,bm.mun@monterglobal.com,8200506613,,MUNDRA,,,
MONTER SHIPPING,Mr CHETAN PARMAR,mun.ops1@monterglobal.com,9998818072,,MUNDRA,,,
WINOCEAN,SAJITHA,csmundra@winocean.in,,,MUNDRA,,,
SEALEAD,RAHUL PANDEY,rahul.pandey@sea-lead.com,9561 398277,,MUNDRA,,,
DECCAN,KULDEEP,kuldeep@deccantrans.com,,,MUNDRA,,,
ARKAS,KSHITIJ,Kshitij.p@pmapl.com,95743 25531,,MUNDRA,,,
SEAGOLD,KULDEEP,bm.mundra@seagoldlog.com,,,MUNDRA,,,
WINOCEAN,John,csmundra1@winocean.in,,,MUNDRA/NHAVA SHEVA,,,
WINOCEAN,DIYAS,insalesmun@winocean.in,,,MUNDRA/NHAVA SHEVA,,,
BLUEMARLINSHIPPING,SHRIKANT,shrikant@bluemarlinshipping.com,91520 03676,GULF/BANDAR ABBAS,NHAVA SHEVA,,,
SEAKING SHIPPING,SHAHNAWAZ,seapricing@seakingshipping.com,80972 90578,GULF,NHAVA SHEVA,,,
WAN HAI,SHAKTI,shakti_p@wanhai.com,7574879742,,MUNDRA,,,
WAN HAI,VARUN,,7574879741,,MUNDRA,,,
WAN HAI,ANIL,,7574879743,,MUNDRA,,,
CMA CGM,Tanay Joshi,AMD.TJOSHI@cma-cgm.com,8169463105,,AHMEDABAD,,,
ALL CARGO,RAHUL,Rahul.Akolkar@allcargologistics.com,7288905438,,MUNDRA,,,
SEACON,AMIT,amit@ssl-india.com,9726244422,,MUNDRA,,,
"""

users_data = [
    ("Aafrin", "aafrin@siddhivinayaklogistics.co.in", "OPERATIONS"),
    ("Dhruvee", "dhruvi@siddhivinayaklogistics.co.in", "QUOTATION"),
    ("Chirag", "chirag@siddhivinayaklogistics.co.in", "SALES"),
    ("Kamal", "kamal@siddhivinayaklogistics.co.in", "SALES"),
    ("Ankur", "ankur@siddhivinayaklogistics.co.in", "ADMIN"),
    ("Jinal", "jinal@siddhivinayaklogistics.co.in", "SALES"),
    ("Shrikar", "shrikar@siddhivinayaklogistics.co.in", "ADMIN"),
    ("Yash", "yash@siddhivinayaklogistics.co.in", "SALES"),
    ("Yogesh", "yogesh@siddhivinayaklogistics.co.in", "SALES"),
    ("Urvish", "urvish@siddhivinayaklogistics.co.in", "QUOTATION"),
    ("Devika", "devika@siddhivinayaklogistics.co.in", "FINANCE"),
]

ports_data = [
    ("Laem Chabang", "THLCH", "Thailand"),
    ("Bangkok", "THBKK", "Thailand"),
    ("Port Klang", "MYPKG", "Malaysia"),
    ("Tanjung Pelepas", "MYTPP", "Malaysia"),
    ("Tanjung Priok (Jakarta)", "IDTPP", "Indonesia"),
    ("Surabaya", "IDSUB", "Indonesia"),
    ("Manila", "PHMNL", "Philippines"),
    ("Cebu", "PHCEB", "Philippines"),
    ("Nhava Sheva (Jawaharlal Nehru Port)", "INNSA", "India"),
    ("Mumbai", "INBOM", "India"),
    ("Chennai", "INMAA", "India"),
    ("Mundra", "INMUN", "India"),
    ("Kolkata", "INCCU", "India"),
    ("Visakhapatnam", "INVTZ", "India"),
    ("Hazira", "INHZR", "India"),
    ("Pipavav", "INPAV", "India"),
    ("Cochin", "INCOK", "India"),
    ("Tuticorin", "INTUT", "India"),
    ("Chattogram", "BDCGP", "Bangladesh"),
    ("Karachi", "PKKHI", "Pakistan"),
    ("Port Qasim", "PKBQM", "Pakistan"),
    ("Colombo", "LKCMB", "Sri Lanka"),
    ("Yangon", "MMRGN", "Myanmar"),
    ("Sihanoukville", "KHSIH", "Cambodia"),
    ("Muara", "BNMUA", "Brunei"),
    ("Jebel Ali", "AEJEA", "United Arab Emirates"),
    ("Dubai", "AEDXB", "United Arab Emirates"),
    ("Khalifa Port (Abu Dhabi)", "AEAUH", "United Arab Emirates"),
    ("Jeddah", "SAJED", "Saudi Arabia"),
    ("Dammam", "SADMM", "Saudi Arabia"),
    ("Sohar", "OMSOH", "Oman"),
    ("Salalah", "OMSLL", "Oman"),
    ("Hamad Port", "QAHMD", "Qatar"),
    ("Shuwaikh", "KWSWK", "Kuwait"),
    ("Mina Salman", "BHMIN", "Bahrain"),
    ("Haifa", "ILHFA", "Israel"),
    ("Ashdod", "ILASH", "Israel"),
    ("Istanbul", "TRIST", "Turkey"),
    ("Izmir", "TRIZM", "Turkey"),
    ("Mersin", "TRMER", "Turkey"),
    ("Poti", "GEPTI", "Georgia"),
    ("Baku", "AZBAK", "Azerbaijan"),
    ("Rotterdam", "NLRTM", "Netherlands"),
    ("Amsterdam", "NLAMS", "Netherlands"),
    ("Antwerp", "BEANR", "Belgium"),
    ("Zeebrugge", "BEZEE", "Belgium"),
    ("Hamburg", "DEHAM", "Germany"),
    ("Bremerhaven", "DEBRV", "Germany"),
    ("Wilhelmshaven", "DEWVN", "Germany"),
    ("Le Havre", "FRLEH", "France"),
    ("Marseille", "FRMRS", "France"),
    ("Valencia", "ESVLC", "Spain"),
    ("Algeciras", "ESALG", "Spain"),
    ("Barcelona", "ESBCN", "Spain"),
    ("Bilbao", "ESBIO", "Spain"),
    ("Sines", "PTSIE", "Portugal"),
    ("Lisbon", "PTLIS", "Portugal"),
    ("Genoa", "ITGOA", "Italy"),
    ("Trieste", "ITTRS", "Italy"),
    ("Gioia Tauro", "ITGIT", "Italy"),
    ("La Spezia", "ITSPE", "Italy"),
    ("Piraeus", "GRPIR", "Greece"),
    ("Thessaloniki", "GRSKG", "Greece"),
    ("Valletta", "MTMLA", "Malta"),
    ("Koper", "SIKOP", "Slovenia"),
    ("Rijeka", "HRRJK", "Croatia"),
    ("Bar", "MEBAR", "Montenegro"),
    ("Durres", "ALDRZ", "Albania"),
    ("Constanta", "ROCND", "Romania"),
    ("Varna", "BGVAR", "Bulgaria"),
    ("Odesa", "UAODS", "Ukraine"),
    ("Gdansk", "PLGDN", "Poland"),
    ("Gdynia", "PLGDY", "Poland"),
    ("Klaipeda", "LTKLJ", "Lithuania"),
    ("Riga", "LVRIX", "Latvia"),
    ("Tallinn", "EETLL", "Estonia"),
    ("Helsinki", "FIHEL", "Finland"),
    ("Gothenburg", "SEGOT", "Sweden"),
    ("Oslo", "NOOSL", "Norway"),
    ("Aarhus", "DKAAR", "Denmark"),
    ("Reykjavik", "ISREY", "Iceland"),
    ("Felixstowe", "GBFXT", "United Kingdom"),
    ("London", "GBLON", "United Kingdom"),
    ("Southampton", "GBSOU", "United Kingdom"),
    ("Liverpool", "GBLIV", "United Kingdom"),
    ("Dublin", "IEDUB", "Ireland"),
    ("St Petersburg", "RULED", "Russia"),
    ("Novorossiysk", "RUNVS", "Russia"),
    ("Port Said", "EGPSD", "Egypt"),
    ("Alexandria", "EGALY", "Egypt"),
    ("Tangier Med", "MATNG", "Morocco"),
    ("Casablanca", "MACAS", "Morocco"),
    ("Algiers", "DZALG", "Algeria"),
    ("Rades", "TNRAD", "Tunisia"),
    ("Tripoli", "LYTIP", "Libya"),
    ("Durban", "ZADUR", "South Africa"),
    ("Cape Town", "ZACPT", "South Africa"),
    ("Ngqura", "ZANGQ", "South Africa"),
    ("Port Elizabeth", "ZAPLZ", "South Africa"),
    ("Walvis Bay", "NAWVB", "Namibia"),
    ("Luanda", "AOLAD", "Angola"),
    ("Pointe-Noire", "CGPNR", "Congo"),
    ("Matadi", "CDMAT", "DR Congo"),
    ("Libreville", "GALBV", "Gabon"),
    ("Douala", "CMDLA", "Cameroon"),
    ("Lagos", "NGLOS", "Nigeria"),
    ("Onne", "NGONN", "Nigeria"),
    ("Tema", "GHTEM", "Ghana"),
    ("Abidjan", "CIABJ", "Cote d'Ivoire"),
    ("Dakar", "SNDKR", "Senegal"),
    ("Nouakchott", "MRNKC", "Mauritania"),
    ("Mombasa", "KEMBA", "Kenya"),
    ("Dar es Salaam", "TZDAR", "Tanzania"),
    ("Maputo", "MZMPM", "Mozambique"),
    ("Toamasina", "MGTOA", "Madagascar"),
    ("Port Louis", "MUPLU", "Mauritius"),
    ("Port Victoria", "SCPRV", "Seychelles"),
    ("Djibouti", "DJJIB", "Djibouti"),
    ("Berbera", "SOBBO", "Somalia"),
    ("Massawa", "ERMSS", "Eritrea"),
    ("Los Angeles", "USLAX", "United States"),
    ("Long Beach", "USLGB", "United States"),
    ("New York", "USNYC", "United States"),
    ("Newark", "USNWK", "United States"),
    ("Savannah", "USSAV", "United States"),
    ("Houston", "USHOU", "United States"),
    ("Charleston", "USCHS", "United States"),
    ("Norfolk", "USORF", "United States"),
    ("Oakland", "USOAK", "United States"),
    ("Seattle", "USSEA", "United States"),
    ("Tacoma", "USTIW", "United States"),
    ("Miami", "USMIA", "United States"),
    ("New Orleans", "USMSY", "United States"),
    ("Baltimore", "USBAL", "United States"),
    ("Philadelphia", "USPHL", "United States"),
    ("Vancouver", "CAVAN", "Canada"),
    ("Montreal", "CAMTR", "Canada"),
    ("Halifax", "CAHAL", "Canada"),
    ("Prince Rupert", "CAPRR", "Canada"),
    ("Saint John", "CASJB", "Canada"),
    ("Manzanillo", "MXZLO", "Mexico"),
    ("Lazaro Cardenas", "MXLZC", "Mexico"),
    ("Veracruz", "MXVER", "Mexico"),
    ("Altamira", "MXATM", "Mexico"),
    ("Balboa", "PABLB", "Panama"),
    ("Cristobal", "PACTB", "Panama"),
    ("Limon", "CRLIO", "Costa Rica"),
    ("Puerto Quetzal", "GTPRQ", "Guatemala"),
    ("Puerto Cortes", "HNPCR", "Honduras"),
    ("Acajutla", "SVAQJ", "El Salvador"),
    ("Corinto", "NICIO", "Nicaragua"),
    ("Kingston", "JMKIN", "Jamaica"),
    ("Caucedo", "DOCAU", "Dominican Republic"),
    ("Santo Domingo", "DOSDQ", "Dominican Republic"),
    ("Freeport", "BSFPO", "Bahamas"),
    ("Port of Spain", "TTPTS", "Trinidad and Tobago"),
    ("Havana", "CUHAV", "Cuba"),
    ("Port-au-Prince", "HTPAP", "Haiti"),
    ("Santos", "BRSSZ", "Brazil"),
    ("Rio de Janeiro", "BRRIO", "Brazil"),
    ("Paranagua", "BRPNG", "Brazil"),
    ("Itajai", "BRITJ", "Brazil"),
    ("Buenos Aires", "ARBUE", "Argentina"),
    ("Rosario", "ARROS", "Argentina"),
    ("Montevideo", "UYMVD", "Uruguay"),
    ("Valparaiso", "CLVAP", "Chile"),
    ("San Antonio", "CLSAI", "Chile"),
    ("Callao", "PECLL", "Peru"),
    ("Guayaquil", "ECGYE", "Ecuador"),
    ("Cartagena", "COCTG", "Colombia"),
    ("Buenaventura", "COBUN", "Colombia"),
    ("Puerto Cabello", "VEPBL", "Venezuela"),
    ("Georgetown", "GYGEO", "Guyana"),
    ("Paramaribo", "SRPBM", "Suriname"),
    ("Cayenne", "GFCAY", "French Guiana"),
    ("Melbourne", "AUMEL", "Australia"),
    ("Sydney", "AUSYD", "Australia"),
    ("Brisbane", "AUBNE", "Australia"),
    ("Fremantle", "AUFRE", "Australia"),
    ("Port Botany", "AUPBQ", "Australia"),
    ("Adelaide", "AUADL", "Australia"),
    ("Auckland", "NZAKL", "New Zealand"),
    ("Tauranga", "NZTRG", "New Zealand"),
    ("Wellington", "NZWLG", "New Zealand"),
    ("Lyttelton", "NZLYT", "New Zealand"),
    ("Port Moresby", "PGPOM", "Papua New Guinea"),
    ("Suva", "FJSUV", "Fiji"),
    ("Noumea", "NCNOU", "New Caledonia"),
    ("Apia", "WSAPW", "Samoa"),
    ("Nuku'alofa", "TOTBU", "Tonga"),
    ("Honiara", "SBHIR", "Solomon Islands"),
]

def clean_email(raw):
    if not raw or raw == "#ERROR!":
        return None
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw)
    return match.group(0).lower() if match else None

def clean_phone(raw):
    if not raw or raw == "#ERROR!":
        return None
    cleaned = re.sub(r'[^\d\+\-\s/]', '', raw).strip()
    return cleaned if len(cleaned) >= 5 else None

def main():
    con = sqlite3.connect("dev.db")
    cur = con.cursor()
    
    print("=== SEEDING GLOBAL PORTS ===")
    port_count = 0
    for name, code, country in ports_data:
        try:
            cur.execute("""
                INSERT OR REPLACE INTO Port (id, name, code, country, createdAt)
                VALUES (
                    COALESCE((SELECT id FROM Port WHERE name = ?), lower(hex(randomblob(12)))),
                    ?, ?, ?, datetime('now')
                )
            """, (name, name, code, country))
            port_count += 1
        except Exception as e:
            print(f"Error inserting port {name}:", e)
    print(f"Seeded {port_count} Ports.")

    print("\n=== SEEDING SHIPPING LINES (LINERS) ===")
    liner_lines = [l.strip() for l in raw_data.strip().splitlines()[1:] if l.strip()]
    liner_count = 0
    
    for line in liner_lines:
        parts = [p.strip() for p in line.split(",")]
        if not parts or not parts[0]:
            continue
        
        name = parts[0].strip()
        contact = parts[1] if len(parts) > 1 and parts[1] else None
        email_raw = parts[2] if len(parts) > 2 else None
        phone_raw = parts[3] if len(parts) > 3 else None
        location = parts[5] if len(parts) > 5 and parts[5] else None
        
        email = clean_email(email_raw)
        phone = clean_phone(phone_raw)
        address = f"Location: {location}" if location else None
        
        # Display clean unique name
        if name.upper() in ["SVIL"]:
            continue
            
        try:
            cur.execute("""
                INSERT OR REPLACE INTO Liner (id, name, contactPerson, email, phone, address, country, createdAt)
                VALUES (
                    COALESCE((SELECT id FROM Liner WHERE name = ?), lower(hex(randomblob(12)))),
                    ?, ?, ?, ?, ?, 'India', datetime('now')
                )
            """, (name, name, contact, email, phone, address))
            liner_count += 1
        except Exception as e:
            print(f"Error inserting liner {name}:", e)
            
    print(f"Seeded/Updated {liner_count} Shipping Lines.")

    print("\n=== SEEDING USERS & LOGINS ===")
    hashed_pass = bcrypt.hashpw(b"svil@2026", bcrypt.gensalt()).decode("utf-8")
    
    # Permissions template
    def get_perms(role):
        is_all = role == "ADMIN"
        is_sales = "SALES" in role
        is_quote = "QUOTATION" in role
        is_ops = "OPERATIONS" in role
        is_fin = "FINANCE" in role
        return json.dumps({
            "dashboard": {"view": True, "add": False, "edit": False, "delete": False},
            "inquiries": {"view": is_all or is_sales, "add": is_all or is_sales, "edit": is_all or is_sales, "delete": is_all},
            "quotations": {"view": is_all or is_sales or is_quote, "add": is_all or is_sales or is_quote, "edit": is_all or is_sales or is_quote, "delete": is_all},
            "jobs": {"view": is_all or is_ops or is_sales, "add": is_all or is_ops, "edit": is_all or is_ops, "delete": is_all},
            "dailyStatus": {"view": is_all or is_ops or is_sales, "add": is_all or is_ops, "edit": is_all or is_ops, "delete": is_all},
            "finance": {"view": is_all or is_fin, "add": is_all or is_fin, "edit": is_all or is_fin, "delete": is_all},
            "hr": {"view": is_all, "add": is_all, "edit": is_all, "delete": is_all},
            "reports": {"view": is_all or is_sales or is_fin, "add": False, "edit": False, "delete": False},
            "masters": {"view": True, "add": is_all, "edit": is_all, "delete": is_all},
            "users": {"view": is_all, "add": is_all, "edit": is_all, "delete": is_all},
        })

    for uname, uemail, urole in users_data:
        try:
            perms = get_perms(urole)
            cur.execute("""
                INSERT OR REPLACE INTO User (id, name, email, password, role, permissions, status, createdAt, updatedAt)
                VALUES (
                    COALESCE((SELECT id FROM User WHERE email = ?), lower(hex(randomblob(12)))),
                    ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now')
                )
            """, (uemail, uname, uemail, hashed_pass, urole, perms))
            print(f"   + User created: {uname} ({uemail}) - Role: {urole}")
        except Exception as e:
            print(f"Error creating user {uemail}:", e)
            
    # Always keep admin@svil.com master admin
    admin_perms = json.dumps({k: {"view": True, "add": True, "edit": True, "delete": True} for k in ["dashboard", "inquiries", "quotations", "jobs", "dailyStatus", "finance", "hr", "reports", "masters", "users"]})
    admin_pass = bcrypt.hashpw(b"admin@svil2026", bcrypt.gensalt()).decode("utf-8")
    cur.execute("""
        INSERT OR REPLACE INTO User (id, name, email, password, role, permissions, status, createdAt, updatedAt)
        VALUES (
            COALESCE((SELECT id FROM User WHERE email = 'admin@svil.com'), lower(hex(randomblob(12)))),
            'Administrator', 'admin@svil.com', ?, 'ADMIN', ?, 'ACTIVE', datetime('now'), datetime('now')
        )
    """, (admin_pass, admin_perms))
    print("   + Master Admin ensured: admin@svil.com")

    con.commit()
    con.close()
    print("\n=========================================")
    print("  ALL MASTERS & USERS POPULATED CLEANLY! ")
    print("=========================================")

if __name__ == "__main__":
    main()
