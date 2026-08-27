/**
 * Station table. Format: CODE|Name|City|StateCode|Zone|Platforms|lat|lng
 * Coordinates are filled in for corridor anchors; blank entries are interpolated
 * along their corridor at seed time (see seed.ts). Geographically approximate for
 * the small halts, but the route traces correctly on the map — which is what the
 * schematic actually needs.
 */

export const STATION_TABLE = `
NDLS|New Delhi|Delhi|DL|NR|16|28.6431|77.2197
NZM|Hazrat Nizamuddin|Delhi|DL|NR|7|28.5885|77.2530
DEC|Delhi Cantt|Delhi|DL|NR|4|28.5900|77.1300
FDB|Faridabad|Faridabad|HR|NR|3|28.3800|77.3100
BVH|Ballabhgarh|Ballabhgarh|HR|NR|3|28.3400|77.3200
PWL|Palwal|Palwal|HR|NR|4|28.1400|77.3300
KSV|Kosi Kalan|Kosi Kalan|UP|NCR|3||
MTJ|Mathura Jn|Mathura|UP|NCR|10|27.4924|77.6737
BTE|Bharatpur Jn|Bharatpur|RJ|NCR|4|27.2200|77.4900
BXN|Bayana Jn|Bayana|RJ|NCR|4||
GGC|Gangapur City|Gangapur City|RJ|NCR|3||
SWM|Sawai Madhopur Jn|Sawai Madhopur|RJ|WCR|5|26.0200|76.3500
IDG|Indargarh|Indargarh|RJ|WCR|2||
KOTA|Kota Jn|Kota|RJ|WCR|6|25.1800|75.8400
RMA|Ramganj Mandi Jn|Ramganj Mandi|RJ|WCR|3||
BHW|Bhawani Mandi|Bhawani Mandi|RJ|WCR|2||
SGZ|Shamgarh|Shamgarh|MP|WCR|3||
VMA|Vikramgarh Alot|Alot|MP|WR|2||
NAD|Nagda Jn|Nagda|MP|WR|4|23.4500|75.4200
RTM|Ratlam Jn|Ratlam|MP|WR|6|23.3300|75.0400
MGN|Meghnagar|Meghnagar|MP|WR|3||
DHD|Dahod|Dahod|GJ|WR|3|22.8300|74.2600
GDA|Godhra Jn|Godhra|GJ|WR|4|22.7700|73.6100
BRC|Vadodara Jn|Vadodara|GJ|WR|7|22.3100|73.1800
BH|Bharuch Jn|Bharuch|GJ|WR|4|21.7100|72.9900
ST|Surat|Surat|GJ|WR|4|21.2050|72.8400
BL|Valsad|Valsad|GJ|WR|4|20.6100|72.9300
VAPI|Vapi|Vapi|GJ|WR|3|20.3700|72.9100
BSR|Vasai Road|Vasai|MH|WR|8|19.3900|72.8300
BVI|Borivali|Mumbai|MH|WR|9|19.2300|72.8600
BDTS|Bandra Terminus|Mumbai|MH|WR|7|19.0600|72.8400
BCT|Mumbai Central|Mumbai|MH|WR|5|18.9700|72.8200
GZB|Ghaziabad Jn|Ghaziabad|UP|NR|6|28.6600|77.4300
KRJ|Khurja Jn|Khurja|UP|NCR|4||
ALJN|Aligarh Jn|Aligarh|UP|NCR|7|27.8900|78.0700
TDL|Tundla Jn|Tundla|UP|NCR|6|27.2100|78.2400
ETW|Etawah Jn|Etawah|UP|NCR|4|26.7800|79.0200
PNK|Phaphund|Phaphund|UP|NCR|3||
CNB|Kanpur Central|Kanpur|UP|NCR|10|26.4547|80.3499
FTP|Fatehpur|Fatehpur|UP|NCR|3|25.9300|80.8000
ALD|Prayagraj Jn|Prayagraj|UP|NCR|10|25.4400|81.8300
MGS|Pt DD Upadhyaya Jn|Chandauli|UP|ECR|8|25.2818|83.1200
DOS|Dehri On Sone|Dehri|BR|ECR|4|24.9200|84.1800
GAYA|Gaya Jn|Gaya|BR|ECR|9|24.7955|85.0002
KQR|Koderma Jn|Koderma|JH|ECR|4|24.4700|85.5900
PNME|Parasnath|Parasnath|JH|ECR|3||
DHN|Dhanbad Jn|Dhanbad|JH|ECR|8|23.7950|86.4300
ASN|Asansol Jn|Asansol|WB|ER|7|23.6800|86.9700
DGR|Durgapur|Durgapur|WB|ER|5|23.5200|87.3100
BWN|Barddhaman Jn|Bardhaman|WB|ER|8|23.2400|87.8600
HWH|Howrah Jn|Kolkata|WB|ER|23|22.5839|88.3425
AGC|Agra Cantt|Agra|UP|NCR|6|27.1570|78.0090
DHO|Dholpur Jn|Dholpur|RJ|NCR|3|26.7000|77.8900
MRA|Morena|Morena|MP|NCR|3||
GWL|Gwalior Jn|Gwalior|MP|NCR|5|26.2200|78.1800
DAA|Datia|Datia|MP|NCR|3||
JHS|Virangana Lakshmibai Jhansi|Jhansi|UP|NCR|8|25.4500|78.5700
LAR|Lalitpur|Lalitpur|UP|NCR|3||
BINA|Bina Jn|Bina|MP|WCR|5|24.1800|78.2000
GLG|Ganj Basoda|Basoda|MP|WCR|3||
BHS|Vidisha|Vidisha|MP|WCR|3|23.5200|77.8100
BPL|Bhopal Jn|Bhopal|MP|WCR|6|23.2680|77.4000
HBJ|Rani Kamlapati|Bhopal|MP|WCR|5|23.2200|77.4400
ET|Itarsi Jn|Itarsi|MP|WCR|7|22.6100|77.7600
BZU|Betul|Betul|MP|WCR|3|21.9000|77.9000
AMLA|Amla Jn|Amla|MP|WCR|3||
PAR|Pandhurna|Pandhurna|MP|SECR|2||
NGP|Nagpur Jn|Nagpur|MH|CR|8|21.1500|79.0900
SEGM|Sewagram Jn|Wardha|MH|CR|4||
CD|Chandrapur|Chandrapur|MH|CR|3|19.9500|79.3000
BPA|Ballarshah Jn|Ballarshah|MH|CR|5|19.8400|79.3500
SKZR|Sirpur Kaghaznagar|Kaghaznagar|TG|SCR|3||
RDM|Ramagundam|Ramagundam|TG|SCR|3|18.7600|79.4700
PDPL|Peddapalli Jn|Peddapalli|TG|SCR|3||
KZJ|Kazipet Jn|Warangal|TG|SCR|5|17.9800|79.5000
WL|Warangal|Warangal|TG|SCR|4|17.9700|79.5900
KMT|Khammam|Khammam|TG|SCR|3|17.2500|80.1500
BZA|Vijayawada Jn|Vijayawada|AP|SCR|10|16.5170|80.6200
TEL|Tenali Jn|Tenali|AP|SCR|5|16.2400|80.6400
OGL|Ongole|Ongole|AP|SCR|3|15.5000|80.0500
NLR|Nellore|Nellore|AP|SCR|4|14.4400|79.9800
GDR|Gudur Jn|Gudur|AP|SCR|5|14.1500|79.8500
SPE|Sullurpeta|Sullurpeta|AP|SCR|3||
GPD|Gummidipundi|Gummidipundi|TN|SR|3||
MAS|MGR Chennai Central|Chennai|TN|SR|17|13.0827|80.2750
CSMT|Mumbai CSMT|Mumbai|MH|CR|18|18.9400|72.8350
DR|Dadar|Mumbai|MH|CR|8|19.0180|72.8440
TNA|Thane|Thane|MH|CR|10|19.1860|72.9750
KYN|Kalyan Jn|Kalyan|MH|CR|8|19.2400|73.1300
KJT|Karjat Jn|Karjat|MH|CR|5|18.9100|73.3200
LNL|Lonavala|Lonavala|MH|CR|4|18.7500|73.4100
PUNE|Pune Jn|Pune|MH|CR|6|18.5290|73.8740
DD|Daund Jn|Daund|MH|CR|5|18.4600|74.5800
KWV|Kurduvadi Jn|Kurduvadi|MH|CR|4||
SUR|Solapur Jn|Solapur|MH|CR|5|17.6600|75.9100
DUD|Dudhani|Dudhani|MH|CR|2||
GR|Kalaburagi Jn|Kalaburagi|KA|SCR|4|17.3300|76.8300
WADI|Wadi Jn|Wadi|KA|SCR|4||
YG|Yadgir|Yadgir|KA|SCR|3||
RC|Raichur Jn|Raichur|KA|SCR|3|16.2000|77.3700
MALM|Mantralayam Road|Mantralayam|AP|SCR|3||
AD|Adoni|Adoni|AP|SCR|3||
GTL|Guntakal Jn|Guntakal|AP|SCR|6|15.1700|77.3700
GY|Gooty|Gooty|AP|SCR|4||
TU|Tadipatri|Tadipatri|AP|SCR|3||
YA|Yerraguntla Jn|Yerraguntla|AP|SCR|3||
HX|Kadapa|Kadapa|AP|SCR|3|14.4700|78.8200
RJP|Razampeta|Razampeta|AP|SCR|2||
KOU|Koduru|Koduru|AP|SCR|2||
RU|Renigunta Jn|Renigunta|AP|SCR|6|13.6500|79.5100
AJJ|Arakkonam Jn|Arakkonam|TN|SR|6|13.0800|79.6700
TI|Tiruvallur|Tiruvallur|TN|SR|4|13.1400|79.9100
AVD|Avadi|Chennai|TN|SR|4|13.1100|80.1000
SBC|KSR Bengaluru City Jn|Bengaluru|KA|SWR|10|12.9770|77.5700
MWM|Malleswaram|Bengaluru|KA|SWR|2||
YPR|Yesvantpur Jn|Bengaluru|KA|SWR|6|13.0230|77.5500
YPRA|Yesvantpur A Cabin|Bengaluru|KA|SWR|0||
BAW|Chik Banavar|Chikkabanavara|KA|SWR|3||
SDVL|Soldevanahalli|Soldevanahalli|KA|SWR|2||
NMGA|Nelamangala|Nelamangala|KA|SWR|2||
SOLR|Solur|Solur|KA|SWR|2||
TASA|Thippasandra|Thippasandra|KA|SWR|2||
KIGL|Kunigal|Kunigal|KA|SWR|2||
SIDP|Siddapur Halt|Siddapur|KA|SWR|1||
YY|Yediyuru|Yediyuru|KA|SWR|2||
ACCI|Adichunchanagiri Halt|Bellur|KA|SWR|1||
BGNR|B G Nagar|Nagamangala|KA|SWR|2||
HISE|Hirisave|Hirisave|KA|SWR|2||
SBGA|Shravanabelagola|Shravanabelagola|KA|SWR|2||
CNPA|Channarayapatna|Channarayapatna|KA|SWR|2||
DSVS|D Samudravalli|Samudravalli|KA|SWR|1||
SIGA|Shantigrama|Shantigrama|KA|SWR|2||
HAS|Hassan Jn|Hassan|KA|SWR|3|13.0000|76.1000
ALUR|Alur Halt|Alur|KA|SWR|1||
BLLT|Ballupete|Ballupete|KA|SWR|2||
SKLR|Sakleshpur|Sakleshpur|KA|SWR|2|12.9400|75.7800
DOGL|Donigal|Donigal|KA|SWR|1||
KGVL|Kadagaravalli|Kadagaravalli|KA|SWR|1||
YDK|Yedakumari|Yedakumari|KA|SWR|1||
SVGL|Shiribagilu|Shiribagilu|KA|SWR|1||
SBHR|Subrahmanya Road|Subrahmanya|KA|SWR|2|12.8000|75.6300
BAJE|Bajakare Halt|Bajakare|KA|SWR|1||
KDBA|Kodimbala Halt|Kodimbala|KA|SWR|1||
YDM|Yedamangala|Yedamangala|KA|SWR|1||
KNYR|Kaniyuru Halt|Kaniyuru|KA|SWR|1||
NRJ|Narimogaru|Narimogaru|KA|SWR|1||
KBPR|Kabaka Puttur|Puttur|KA|SWR|2|12.7600|75.2000
NRF|Neralakatte Halt|Neralakatte|KA|SWR|1||
BNTL|Bantawala|Bantwal|KA|SWR|2|12.8900|75.0300
PADL|Padil|Mangaluru|KA|SWR|2||
MAJN|Mangaluru Jn|Mangaluru|KA|SWR|3|12.8700|74.8600
NTVT|Nethravathi Cabin|Mangaluru|KA|SWR|0||
MAQ|Mangaluru Central|Mangaluru|KA|SR|5|12.8600|74.8400
ULL|Ullal|Ullal|KA|SR|2||
MJS|Manjeshwar|Manjeshwar|KL|SR|2||
UAA|Uppala|Uppala|KL|SR|2||
KMQ|Kumbla|Kumbla|KL|SR|2||
KGQ|Kasaragod|Kasaragod|KL|SR|3|12.5000|74.9900
KLAD|Kalanad Halt|Kalanad|KL|SR|1||
KQK|Kotikulam|Kotikulam|KL|SR|2||
BFR|Bekal Fort|Bekal|KL|SR|2||
KZE|Kanhangad|Kanhangad|KL|SR|2|12.3100|75.0800
NLE|Nileshwar|Nileshwar|KL|SR|2||
CHV|Charvattur|Charvattur|KL|SR|2||
CDRA|Chandera|Chandera|KL|SR|1||
TKQ|Trikarpur|Trikarpur|KL|SR|2||
PAY|Payyanur|Payyanur|KL|SR|2|12.1000|75.2000
ELM|Ezhimala|Ezhimala|KL|SR|2||
PAZ|Payangadi|Payangadi|KL|SR|2||
KPQ|Kannapuram|Kannapuram|KL|SR|2||
PPNS|Pappinisseri|Pappinisseri|KL|SR|2||
VAPM|Valapattanam|Valapattanam|KL|SR|2||
CQL|Chirakkal|Chirakkal|KL|SR|1||
CAN|Kannur|Kannur|KL|SR|4|11.8700|75.3700
CS|Kannur South|Kannur|KL|SR|2||
ETK|Edakkad|Edakkad|KL|SR|2||
DMD|Dharmadam|Dharmadam|KL|SR|2||
TLY|Thalassery|Thalassery|KL|SR|3|11.7500|75.4900
JGE|Jagannath Temple Gate|Thalassery|KL|SR|1||
MAHE|Mahe|Mahe|PY|SR|2||
MUKE|Mukkali|Mukkali|KL|SR|1||
NAU|Nadapuram Road|Nadapuram|KL|SR|2||
BDJ|Vadakara|Vadakara|KL|SR|3|11.6000|75.5900
IGL|Iringal|Iringal|KL|SR|2||
PYOL|Payyoli|Payyoli|KL|SR|2||
TKT|Tikkotti|Tikkotti|KL|SR|2||
VEK|Vellarakkad|Vellarakkad|KL|SR|1||
QLD|Quilandi|Koyilandy|KL|SR|2|11.4400|75.7000
CMC|Chemancheri|Chemancheri|KL|SR|2||
ETR|Elathur|Elathur|KL|SR|2||
WH|West Hill|Kozhikode|KL|SR|2||
VLL|Vellayil|Kozhikode|KL|SR|2||
CLT|Kozhikode|Kozhikode|KL|SR|4|11.2500|75.7800
TBM|Tambaram|Chennai|TN|SR|8|12.9200|80.1200
CGL|Chengalpattu Jn|Chengalpattu|TN|SR|5|12.6900|79.9800
KPD|Katpadi Jn|Vellore|TN|SR|5|12.9700|79.1400
JTJ|Jolarpettai Jn|Jolarpettai|TN|SR|6|12.5700|78.5800
SA|Salem Jn|Salem|TN|SR|6|11.6600|78.1400
ED|Erode Jn|Erode|TN|SR|5|11.3400|77.7200
TUP|Tiruppur|Tiruppur|TN|SR|4|11.1100|77.3400
CBE|Coimbatore Jn|Coimbatore|TN|SR|6|11.0020|76.9660
PGT|Palakkad Jn|Palakkad|KL|SR|5|10.7800|76.6500
SRR|Shoranur Jn|Shoranur|KL|SR|7|10.7600|76.2700
TCR|Thrissur|Thrissur|KL|SR|4|10.5200|76.2100
AWY|Aluva|Aluva|KL|SR|4|10.1100|76.3500
ERS|Ernakulam Jn|Kochi|KL|SR|6|9.9700|76.2800
KTYM|Kottayam|Kottayam|KL|SR|3|9.5900|76.5200
CGY|Chengannur|Chengannur|KL|SR|3||
MVLK|Mavelikara|Mavelikara|KL|SR|2||
KYJ|Kayankulam Jn|Kayankulam|KL|SR|3||
QLN|Kollam Jn|Kollam|KL|SR|6|8.8800|76.5900
VAK|Varkala Sivagiri|Varkala|KL|SR|2||
TVC|Thiruvananthapuram Central|Thiruvananthapuram|KL|SR|5|8.4880|76.9500
SRC|Santragachi Jn|Kolkata|WB|SER|6|22.5900|88.2700
KGP|Kharagpur Jn|Kharagpur|WB|SER|12|22.3400|87.3300
BLS|Balasore|Balasore|OD|ECoR|4|21.5000|86.9300
BHC|Bhadrak|Bhadrak|OD|ECoR|4|21.0600|86.5000
JJKR|Jajpur K Road|Jajpur|OD|ECoR|4||
CTC|Cuttack|Cuttack|OD|ECoR|5|20.4700|85.8800
BBS|Bhubaneswar|Bhubaneswar|OD|ECoR|6|20.2700|85.8400
KUR|Khurda Road Jn|Khurda|OD|ECoR|6|20.1800|85.6200
BAM|Brahmapur|Brahmapur|OD|ECoR|4|19.3100|84.7900
PSA|Palasa|Palasa|AP|ECoR|3||
CHE|Srikakulam Road|Srikakulam|AP|ECoR|3||
VZM|Vizianagaram Jn|Vizianagaram|AP|ECoR|5|18.1100|83.4200
VSKP|Visakhapatnam|Visakhapatnam|AP|ECoR|8|17.7300|83.3000
DVD|Duvvada|Visakhapatnam|AP|ECoR|4||
ANV|Anakapalle|Anakapalle|AP|ECoR|3||
TUNI|Tuni|Tuni|AP|SCR|3||
SLO|Samalkot Jn|Samalkot|AP|SCR|4||
RJY|Rajahmundry|Rajahmundry|AP|SCR|5|17.0000|81.7800
NDD|Nidadavolu Jn|Nidadavolu|AP|SCR|3||
TDD|Tadepalligudem|Tadepalligudem|AP|SCR|3||
EE|Eluru|Eluru|AP|SCR|3|16.7100|81.1000
PNP|Panipat Jn|Panipat|HR|NR|5|29.3900|76.9700
KUN|Karnal|Karnal|HR|NR|3|29.6900|76.9900
KKDE|Kurukshetra Jn|Kurukshetra|HR|NR|5|29.9700|76.8300
UMB|Ambala Cantt Jn|Ambala|HR|NR|7|30.3600|76.8300
RPJ|Rajpura Jn|Rajpura|PB|NR|4||
SIR|Sirhind Jn|Sirhind|PB|NR|4||
LDH|Ludhiana Jn|Ludhiana|PB|NR|7|30.9100|75.8500
PGW|Phagwara Jn|Phagwara|PB|NR|3||
JUC|Jalandhar City|Jalandhar|PB|NR|6|31.3300|75.5800
DZA|Dasuya|Dasuya|PB|NR|3||
MEX|Mukerian|Mukerian|PB|NR|3||
PTK|Pathankot Cantt|Pathankot|PB|NR|5|32.2700|75.6500
KTHU|Kathua|Kathua|JK|NR|3||
HSX|Hiranagar|Hiranagar|JK|NR|2||
JAT|Jammu Tawi|Jammu|JK|NR|5|32.7100|74.8700
UHP|Udhampur|Udhampur|JK|NR|3|32.9200|75.1300
SVDK|SMVD Katra|Katra|JK|NR|4|32.9900|74.9500
ADI|Ahmedabad Jn|Ahmedabad|GJ|WR|12|23.0250|72.5800
MSH|Mahesana Jn|Mahesana|GJ|WR|4||
PNU|Palanpur Jn|Palanpur|GJ|WR|4|24.1700|72.4300
ABR|Abu Road|Abu Road|RJ|NWR|4|24.4800|72.7800
FA|Falna|Falna|RJ|NWR|3||
MJ|Marwar Jn|Marwar|RJ|NWR|4||
BER|Beawar|Beawar|RJ|NWR|3||
AII|Ajmer Jn|Ajmer|RJ|NWR|5|26.4600|74.6400
KSG|Kishangarh|Kishangarh|RJ|NWR|3||
JP|Jaipur Jn|Jaipur|RJ|NWR|7|26.9200|75.7900
GADJ|Gandhinagar Jaipur|Jaipur|RJ|NWR|3||
DO|Dausa|Dausa|RJ|NWR|3||
BKI|Bandikui Jn|Bandikui|RJ|NWR|4||
AWR|Alwar Jn|Alwar|RJ|NWR|4|27.5500|76.6300
KRH|Khairthal|Khairthal|RJ|NWR|3||
RE|Rewari Jn|Rewari|HR|NWR|5|28.1900|76.6200
GGN|Gurugram|Gurugram|HR|NWR|3|28.4600|77.0300
MB|Moradabad Jn|Moradabad|UP|NR|7|28.8400|78.7700
RK|Rampur|Rampur|UP|NR|3|28.8100|79.0300
BE|Bareilly Jn|Bareilly|UP|NR|5|28.3700|79.4100
SPN|Shahjahanpur|Shahjahanpur|UP|NR|4|27.8800|79.9100
HRI|Hardoi|Hardoi|UP|NR|3|27.4200|80.1200
LKO|Lucknow Charbagh|Lucknow|UP|NR|9|26.8309|80.9247
GD|Gonda Jn|Gonda|UP|NER|5|27.1300|81.9600
BST|Basti|Basti|UP|NER|4|26.8000|82.7300
GKP|Gorakhpur Jn|Gorakhpur|UP|NER|10|26.7600|83.3700
DEOS|Deoria Sadar|Deoria|UP|NER|3||
SV|Siwan Jn|Siwan|BR|NER|4||
CPR|Chhapra Jn|Chhapra|BR|NER|5|25.7800|84.7300
SEE|Sonpur Jn|Sonpur|BR|ECR|4||
HJP|Hajipur Jn|Hajipur|BR|ECR|4|25.6800|85.2100
PNBE|Patna Jn|Patna|BR|ECR|10|25.6020|85.1376
IGP|Igatpuri|Igatpuri|MH|CR|5|19.6900|73.5600
NK|Nashik Road|Nashik|MH|CR|4|19.9500|73.8400
MMR|Manmad Jn|Manmad|MH|CR|6|20.2500|74.4800
BSL|Bhusaval Jn|Bhusaval|MH|CR|8|21.0400|75.7900
AK|Akola Jn|Akola|MH|CR|5|20.7000|77.0000
BD|Badnera Jn|Amravati|MH|CR|4|20.8500|77.7300
WR|Wardha Jn|Wardha|MH|CR|5|20.7400|78.6000
G|Gondia Jn|Gondia|MH|SECR|6|21.4500|80.2000
DGG|Dongargarh|Dongargarh|CG|SECR|3||
R|Raipur Jn|Raipur|CG|SECR|7|21.2400|81.6300
BSP|Bilaspur Jn|Bilaspur|CG|SECR|8|22.0800|82.1500
RIG|Raigarh|Raigarh|CG|SECR|4||
JSG|Jharsuguda Jn|Jharsuguda|OD|SECR|5|21.8600|84.0300
ROU|Rourkela|Rourkela|OD|SER|5|22.2200|84.8600
CKP|Chakradharpur|Chakradharpur|JH|SER|4||
TATA|Tatanagar Jn|Jamshedpur|JH|SER|6|22.7800|86.2000
`.trim();
