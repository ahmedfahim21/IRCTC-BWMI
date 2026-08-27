/**
 * Corridors are the geographic backbone. A corridor is an ordered list of every
 * station on a route with its cumulative distance from the corridor origin.
 *
 * Trains are then defined as a corridor + a direction + a halt pattern, which is
 * what lets us render RailRadar-style timelines that include stations the train
 * only *passes through* — and lets us compute crossings between any two trains
 * that share a corridor.
 *
 * Format per stop: "CODE:distanceKm"
 */

export interface CorridorSpec {
  id: string;
  name: string;
  stops: string;
}

export const CORRIDOR_SPECS: CorridorSpec[] = [
  {
    id: "delhi-mumbai-wr",
    name: "Delhi – Mumbai (Western)",
    stops: `NDLS:0 NZM:8 FDB:27 BVH:34 PWL:57 KSV:98 MTJ:141 BTE:175 BXN:216 GGC:273
      SWM:351 IDG:404 KOTA:465 RMA:522 BHW:545 SGZ:578 VMA:617 NAD:686 RTM:728
      MGN:793 DHD:828 GDA:873 BRC:986 BH:1057 ST:1114 BL:1181 VAPI:1200 BSR:1287
      BVI:1361 BDTS:1375 BCT:1385`,
  },
  {
    id: "delhi-howrah-gc",
    name: "Delhi – Howrah (Grand Chord)",
    stops: `NDLS:0 GZB:19 KRJ:79 ALJN:126 TDL:195 ETW:297 PNK:344 CNB:435 FTP:512
      ALD:630 MGS:783 DOS:862 GAYA:985 KQR:1057 PNME:1104 DHN:1150 ASN:1205
      DGR:1247 BWN:1301 HWH:1447`,
  },
  {
    id: "delhi-chennai",
    name: "Delhi – Chennai (Grand Trunk)",
    stops: `NDLS:0 NZM:8 FDB:27 PWL:57 MTJ:141 AGC:195 DHO:249 MRA:275 GWL:305
      DAA:331 JHS:403 LAR:500 BINA:555 GLG:594 BHS:620 BPL:702 HBJ:707 ET:794
      BZU:900 AMLA:925 PAR:985 NGP:1093 SEGM:1170 CD:1265 BPA:1280 SKZR:1330
      RDM:1400 PDPL:1420 KZJ:1487 WL:1495 KMT:1590 BZA:1690 TEL:1720 OGL:1810
      NLR:1930 GDR:1968 SPE:2005 GPD:2050 MAS:2182`,
  },
  {
    id: "mumbai-chennai-pune",
    name: "Mumbai – Chennai (via Pune)",
    stops: `CSMT:0 DR:9 TNA:34 KYN:54 KJT:100 LNL:128 PUNE:192 DD:267 KWV:340
      SUR:455 DUD:500 GR:568 WADI:605 YG:655 RC:715 MALM:760 AD:800 GTL:850
      GY:875 TU:915 YA:985 HX:1025 RJP:1070 KOU:1100 RU:1160 AJJ:1255 TI:1280
      AVD:1295 MAS:1320`,
  },
  {
    id: "bengaluru-kozhikode",
    name: "Bengaluru – Mangaluru – Kozhikode",
    stops: `SBC:0 MWM:3 YPR:5 YPRA:6 BAW:14 SDVL:17 NMGA:28 SOLR:44 TASA:60
      KIGL:73 SIDP:84 YY:90 ACCI:102 BGNR:105 HISE:123 SBGA:139 CNPA:147
      DSVS:157 SIGA:170 HAS:180 ALUR:193 BLLT:208 SKLR:222 DOGL:230 KGVL:240
      YDK:247 SVGL:265 SBHR:277 BAJE:283 KDBA:287 YDM:291 KNYR:300 NRJ:310
      KBPR:320 NRF:330 BNTL:344 PADL:361 MAJN:363 NTVT:367 MAQ:370 ULL:375
      MJS:384 UAA:391 KMQ:400 KGQ:413 KLAD:415 KQK:422 BFR:427 KZE:435 NLE:445
      CHV:450 CDRA:454 TKQ:458 PAY:465 ELM:470 PAZ:476 KPQ:484 PPNS:490
      VAPM:491 CQL:494 CAN:498 CS:502 ETK:511 DMD:515 TLY:519 JGE:521 MAHE:528
      MUKE:532 NAU:536 BDJ:541 IGL:547 PYOL:551 TKT:554 VEK:558 QLD:563
      CMC:568 ETR:576 WH:583 VLL:585 CLT:587`,
  },
  {
    id: "chennai-trivandrum",
    name: "Chennai – Thiruvananthapuram",
    stops: `MAS:0 TBM:28 CGL:56 AJJ:69 KPD:129 JTJ:216 SA:334 ED:400 TUP:450
      CBE:500 PGT:555 SRR:588 TCR:621 AWY:682 ERS:700 KTYM:765 CGY:800
      MVLK:812 KYJ:825 QLN:875 VAK:905 TVC:935`,
  },
  {
    id: "howrah-chennai-coast",
    name: "Howrah – Chennai (East Coast)",
    stops: `HWH:0 SRC:8 KGP:116 BLS:235 BHC:292 JJKR:340 CTC:415 BBS:443 KUR:462
      BAM:610 PSA:700 CHE:760 VZM:830 VSKP:890 DVD:905 ANV:925 TUNI:985
      SLO:1040 RJY:1075 NDD:1105 TDD:1130 EE:1180 BZA:1240 TEL:1272 OGL:1362
      NLR:1480 GDR:1518 SPE:1555 MAS:1660`,
  },
  {
    id: "delhi-katra",
    name: "Delhi – Jammu – Katra",
    stops: `NDLS:0 PNP:90 KUN:123 KKDE:158 UMB:200 RPJ:227 SIR:253 LDH:310
      PGW:345 JUC:372 DZA:425 MEX:445 PTK:480 KTHU:510 HSX:525 JAT:585
      UHP:640 SVDK:655`,
  },
  {
    id: "ahmedabad-delhi-jaipur",
    name: "Ahmedabad – Jaipur – Delhi",
    stops: `ADI:0 MSH:68 PNU:133 ABR:187 FA:260 MJ:320 BER:400 AII:452 KSG:480
      JP:587 GADJ:592 DO:650 BKI:680 AWR:736 KRH:765 RE:830 GGN:875 DEC:890
      NDLS:930`,
  },
  {
    id: "delhi-patna-gkp",
    name: "Delhi – Lucknow – Gorakhpur – Patna",
    stops: `NDLS:0 GZB:19 MB:150 RK:178 BE:230 SPN:300 HRI:360 LKO:493 GD:610
      BST:700 GKP:770 DEOS:820 SV:880 CPR:940 SEE:990 HJP:1000 PNBE:1010`,
  },
  {
    id: "mumbai-howrah-nagpur",
    name: "Mumbai – Nagpur – Howrah",
    stops: `CSMT:0 DR:9 KYN:54 IGP:130 NK:185 MMR:260 BSL:380 AK:500 BD:590
      WR:665 NGP:745 G:875 DGG:970 R:1090 BSP:1200 RIG:1300 JSG:1370 ROU:1440
      CKP:1540 TATA:1600 KGP:1730 HWH:1846`,
  },
];
