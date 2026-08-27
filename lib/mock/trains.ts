/**
 * Train roster. A train is a corridor + a direction + a halt tier + a departure time.
 * The full stop-level schedule is derived in seed.ts, which is why a train's timeline
 * can show stations it only passes through.
 *
 * Format: number|name|type|corridorId|direction|from|to|depart|runsOn|classes|pantry|returns
 *   direction : up = along corridor order, down = reversed
 *   runsOn    : "daily" or comma-separated weekday indices (0 = Sunday)
 *   pantry    : y/n
 */

export const TRAIN_TABLE = `
12952|New Delhi – Mumbai Central Rajdhani|rajdhani|delhi-mumbai-wr|up|NDLS|BCT|16:25|daily|1A,2A,3A|y|12951
12951|Mumbai Central – New Delhi Rajdhani|rajdhani|delhi-mumbai-wr|down|BCT|NDLS|17:00|daily|1A,2A,3A|y|12952
12954|August Kranti Rajdhani|rajdhani|delhi-mumbai-wr|up|NZM|BCT|16:35|daily|1A,2A,3A|y|12953
12953|August Kranti Rajdhani|rajdhani|delhi-mumbai-wr|down|BCT|NZM|17:40|daily|1A,2A,3A|y|12954
22210|New Delhi – Mumbai Central Duronto|duronto|delhi-mumbai-wr|up|NDLS|BCT|23:00|1,4,6|2A,3A,SL|y|22209
22209|Mumbai Central – New Delhi Duronto|duronto|delhi-mumbai-wr|down|BCT|NDLS|23:05|0,3,5|2A,3A,SL|y|22210
12926|Paschim Express|superfast|delhi-mumbai-wr|down|BCT|NDLS|11:25|daily|1A,2A,3A,SL|y|12925
12925|Paschim Express|superfast|delhi-mumbai-wr|up|NDLS|BCT|15:30|daily|1A,2A,3A,SL|y|12926
12904|Golden Temple Mail|superfast|delhi-mumbai-wr|down|BCT|NDLS|21:25|daily|2A,3A,SL,2S|y|12903
12903|Golden Temple Mail|superfast|delhi-mumbai-wr|up|NDLS|BCT|07:05|daily|2A,3A,SL,2S|y|12904
19024|Firozpur Janata Express|express|delhi-mumbai-wr|down|BCT|NDLS|12:55|daily|3A,SL,2S|n|19023
19023|Firozpur Janata Express|express|delhi-mumbai-wr|up|NDLS|BCT|13:40|daily|3A,SL,2S|n|19024
12302|Howrah Rajdhani|rajdhani|delhi-howrah-gc|up|NDLS|HWH|16:55|daily|1A,2A,3A|y|12301
12301|Howrah Rajdhani|rajdhani|delhi-howrah-gc|down|HWH|NDLS|16:50|daily|1A,2A,3A|y|12302
12382|Poorva Express|superfast|delhi-howrah-gc|down|HWH|NDLS|20:15|1,3,5|1A,2A,3A,SL|y|12381
12381|Poorva Express|superfast|delhi-howrah-gc|up|NDLS|HWH|16:10|0,2,4|1A,2A,3A,SL|y|12382
12312|Netaji Express|express|delhi-howrah-gc|down|HWH|NDLS|19:40|daily|2A,3A,SL,2S|y|12311
12311|Netaji Express|express|delhi-howrah-gc|up|NDLS|HWH|07:40|daily|2A,3A,SL,2S|y|12312
13008|Udyan Abha Toofan Express|express|delhi-howrah-gc|down|HWH|NDLS|09:05|daily|3A,SL,2S|n|13007
13007|Udyan Abha Toofan Express|express|delhi-howrah-gc|up|NDLS|HWH|17:20|daily|3A,SL,2S|n|13008
12622|Tamil Nadu Express|superfast|delhi-chennai|up|NDLS|MAS|22:30|daily|1A,2A,3A,SL|y|12621
12621|Tamil Nadu Express|superfast|delhi-chennai|down|MAS|NDLS|22:00|daily|1A,2A,3A,SL|y|12622
12616|Grand Trunk Express|superfast|delhi-chennai|up|NDLS|MAS|18:40|daily|1A,2A,3A,SL|y|12615
12615|Grand Trunk Express|superfast|delhi-chennai|down|MAS|NDLS|19:15|daily|1A,2A,3A,SL|y|12616
12434|Chennai Rajdhani|rajdhani|delhi-chennai|down|MAS|NZM|06:05|2,5|1A,2A,3A|y|12433
12433|Chennai Rajdhani|rajdhani|delhi-chennai|up|NZM|MAS|15:55|0,3|1A,2A,3A|y|12434
12270|Chennai Duronto|duronto|delhi-chennai|up|NZM|MAS|15:45|1,4|2A,3A,SL|y|12269
12269|Chennai Duronto|duronto|delhi-chennai|down|MAS|NZM|06:40|2,6|2A,3A,SL|y|12270
11042|Mumbai – Chennai Express|express|mumbai-chennai-pune|up|CSMT|MAS|00:15|daily|2A,3A,SL,2S|y|11041
11041|Chennai – Mumbai Express|express|mumbai-chennai-pune|down|MAS|CSMT|06:50|daily|2A,3A,SL,2S|y|11042
12163|Chalukya Express|superfast|mumbai-chennai-pune|up|DR|MAS|00:05|daily|2A,3A,SL,2S|y|12164
12164|Chalukya Express|superfast|mumbai-chennai-pune|down|MAS|DR|18:20|daily|2A,3A,SL,2S|y|12163
11007|Deccan Express|express|mumbai-chennai-pune|up|CSMT|PUNE|07:00|daily|CC,2S|n|11008
11008|Deccan Express|express|mumbai-chennai-pune|down|PUNE|CSMT|15:15|daily|CC,2S|n|11007
22105|Indrayani Express|superfast|mumbai-chennai-pune|down|PUNE|CSMT|17:25|daily|CC,2S|n|22106
22106|Indrayani Express|superfast|mumbai-chennai-pune|up|CSMT|PUNE|05:40|daily|CC,2S|n|22105
16511|KSR Bengaluru – Kozhikode Express|express|bengaluru-kozhikode|up|SBC|CLT|21:35|daily|2A,3A,SL,2S|n|16512
16512|Kozhikode – KSR Bengaluru Express|express|bengaluru-kozhikode|down|CLT|SBC|19:10|daily|2A,3A,SL,2S|n|16511
16517|KSR Bengaluru – Kannur Express|express|bengaluru-kozhikode|up|SBC|CAN|20:15|daily|2A,3A,SL,2S|n|16518
16518|Kannur – KSR Bengaluru Express|express|bengaluru-kozhikode|down|CAN|SBC|17:45|daily|2A,3A,SL,2S|n|16517
16575|Gomateshwara Express|express|bengaluru-kozhikode|up|YPR|MAJN|21:05|daily|2A,3A,SL|n|16576
16576|Gomateshwara Express|express|bengaluru-kozhikode|down|MAJN|YPR|19:35|daily|2A,3A,SL|n|16575
56281|Bengaluru – Hassan Passenger|passenger|bengaluru-kozhikode|up|SBC|HAS|06:15|daily|2S|n|56282
12696|Chennai – Trivandrum Superfast|superfast|chennai-trivandrum|up|MAS|TVC|15:20|daily|2A,3A,SL,2S|y|12695
12695|Trivandrum – Chennai Superfast|superfast|chennai-trivandrum|down|TVC|MAS|11:15|daily|2A,3A,SL,2S|y|12696
12624|Chennai – Trivandrum Mail|express|chennai-trivandrum|up|MAS|TVC|19:45|daily|1A,2A,3A,SL|y|12623
12623|Trivandrum – Chennai Mail|express|chennai-trivandrum|down|TVC|MAS|15:25|daily|1A,2A,3A,SL|y|12624
12243|Coimbatore Shatabdi|shatabdi|chennai-trivandrum|up|MAS|CBE|07:15|1,2,3,4,5,6|CC,EC|y|12244
12244|Coimbatore Shatabdi|shatabdi|chennai-trivandrum|down|CBE|MAS|14:30|1,2,3,4,5,6|CC,EC|y|12243
12675|Kovai Express|superfast|chennai-trivandrum|up|MAS|CBE|06:15|daily|CC,2S|n|12676
12676|Kovai Express|superfast|chennai-trivandrum|down|CBE|MAS|14:20|daily|CC,2S|n|12675
12841|Coromandel Express|superfast|howrah-chennai-coast|up|HWH|MAS|15:20|daily|1A,2A,3A,SL|y|12842
12842|Coromandel Express|superfast|howrah-chennai-coast|down|MAS|HWH|08:45|daily|1A,2A,3A,SL|y|12841
12840|Howrah – Chennai Mail|express|howrah-chennai-coast|up|HWH|MAS|23:45|daily|1A,2A,3A,SL|y|12839
12839|Chennai – Howrah Mail|express|howrah-chennai-coast|down|MAS|HWH|22:30|daily|1A,2A,3A,SL|y|12840
18045|East Coast Express|express|howrah-chennai-coast|up|HWH|VSKP|21:00|daily|2A,3A,SL,2S|n|18046
12074|Howrah – Bhubaneswar Jan Shatabdi|shatabdi|howrah-chennai-coast|up|HWH|BBS|06:05|1,2,3,4,5,6|CC,2S|n|12073
12073|Bhubaneswar – Howrah Jan Shatabdi|shatabdi|howrah-chennai-coast|down|BBS|HWH|13:35|1,2,3,4,5,6|CC,2S|n|12074
12425|New Delhi – Katra Rajdhani|rajdhani|delhi-katra|up|NDLS|SVDK|20:40|daily|1A,2A,3A|y|12426
12426|Katra – New Delhi Rajdhani|rajdhani|delhi-katra|down|SVDK|NDLS|20:00|daily|1A,2A,3A|y|12425
22439|Katra Vande Bharat|vandeBharat|delhi-katra|up|NDLS|SVDK|06:00|0,1,2,3,4,5|CC,EC|y|22440
22440|Katra Vande Bharat|vandeBharat|delhi-katra|down|SVDK|NDLS|15:00|0,1,2,3,4,5|CC,EC|y|22439
12445|Uttar Sampark Kranti|superfast|delhi-katra|up|NDLS|SVDK|21:25|daily|2A,3A,SL|n|12446
12446|Uttar Sampark Kranti|superfast|delhi-katra|down|SVDK|NDLS|19:50|daily|2A,3A,SL|n|12445
12958|Swarna Jayanti Rajdhani|rajdhani|ahmedabad-delhi-jaipur|up|ADI|NDLS|17:40|daily|1A,2A,3A|y|12957
12957|Swarna Jayanti Rajdhani|rajdhani|ahmedabad-delhi-jaipur|down|NDLS|ADI|19:55|daily|1A,2A,3A|y|12958
12916|Ashram Express|express|ahmedabad-delhi-jaipur|up|ADI|NDLS|18:20|daily|2A,3A,SL,2S|y|12915
12915|Ashram Express|express|ahmedabad-delhi-jaipur|down|NDLS|ADI|15:05|daily|2A,3A,SL,2S|y|12916
12065|Ajmer Jan Shatabdi|shatabdi|ahmedabad-delhi-jaipur|up|AII|NDLS|06:20|daily|CC,2S|n|12066
12554|Vaishali Express|superfast|delhi-patna-gkp|down|PNBE|NDLS|06:15|daily|2A,3A,SL,2S|y|12553
12553|Vaishali Express|superfast|delhi-patna-gkp|up|NDLS|PNBE|19:40|daily|2A,3A,SL,2S|y|12554
12558|Sapt Kranti Express|superfast|delhi-patna-gkp|down|GKP|NDLS|17:00|daily|2A,3A,SL|y|12557
12557|Sapt Kranti Express|superfast|delhi-patna-gkp|up|NDLS|GKP|21:00|daily|2A,3A,SL|y|12558
12566|Bihar Sampark Kranti|superfast|delhi-patna-gkp|down|PNBE|NDLS|09:45|daily|2A,3A,SL|n|12565
12565|Bihar Sampark Kranti|superfast|delhi-patna-gkp|up|NDLS|PNBE|18:25|daily|2A,3A,SL|n|12566
12810|Mumbai Mail|express|mumbai-howrah-nagpur|up|CSMT|HWH|20:35|daily|1A,2A,3A,SL|y|12809
12809|Howrah Mail|express|mumbai-howrah-nagpur|down|HWH|CSMT|21:50|daily|1A,2A,3A,SL|y|12810
12262|Mumbai – Howrah Duronto|duronto|mumbai-howrah-nagpur|up|CSMT|HWH|20:05|2,4,6|1A,2A,3A|y|12261
12261|Howrah – Mumbai Duronto|duronto|mumbai-howrah-nagpur|down|HWH|CSMT|08:35|1,3,5|1A,2A,3A|y|12262
12859|Gitanjali Express|superfast|mumbai-howrah-nagpur|up|CSMT|HWH|06:00|daily|2A,3A,SL|y|12860
12860|Gitanjali Express|superfast|mumbai-howrah-nagpur|down|HWH|CSMT|13:50|daily|2A,3A,SL|y|12859
`.trim();
