// Echte Wahlergebnisse (Erst-/Zweitstimmen) der Wiederholungswahl zum
// Abgeordnetenhaus Berlin am 12.02.2023, amtliches Endergebnis, alle 78 Wahlkreise.
// Quelle: Landeswahlleiterin Berlin, wahlen-berlin.de/wahlen/BE2023/AFSPRAES/agh/
// Nur die 6 hier gelisteten Parteien werden abgebildet (kleinere Parteien wie
// Die PARTEI, Tierschutzpartei, dieBasis, FREIE WÄHLER sind nicht enthalten) -
// die Prozentwerte in der App beziehen sich daher nur auf diese 6 Parteien.
//
// PLZ-Zuordnung ist auf Bezirksebene (nicht Wahlkreis-Ebene), weil Berlins ~190
// Postleitzahlgebiete nicht deckungsgleich mit Wahlkreis- oder teils sogar mit
// Bezirksgrenzen sind. Die App lässt dich deinen Wahlkreis aus der Liste deines
// Bezirks wählen, statt ihn (falsch-praezise) automatisch zu bestimmen.

const PARTIES = [
  { id: "spd", name: "SPD", color: "#e3000f" },
  { id: "cdu", name: "CDU", color: "#000000" },
  { id: "gruene", name: "Grüne", color: "#1fa22d" },
  { id: "linke", name: "Linke", color: "#be3075" },
  { id: "afd", name: "AfD", color: "#009ee0" },
  { id: "fdp", name: "FDP", color: "#ffed00" },
];

// Aktueller Berlin-Wahltrend (Durchschnitt mehrerer Institute), keine
// Wahlkreis-Ebene - wird als landesweiter "Uniform Swing" auf die
// 2023er-Wahlkreisdaten angewendet (siehe engine.js: buildCurrentBaseline).
// Quelle: dawum.de/Berlin/, Wahltrend aus 4 Umfragen im Zeitraum
// 22.08.–04.09.2026, 6.814 Befragte insgesamt.
const CURRENT_POLL = {
  date: "04.09.2026",
  source: "dawum.de Wahltrend (Ø 4 Umfragen, 22.08.–04.09.2026)",
  shares: { spd: 12.9, cdu: 19.7, gruene: 16.0, linke: 19.7, afd: 18.0, fdp: 3.2 },
};

const BEZIRKE = [
  { id: "mitte", name: "Mitte", plz: ["10115","10117","10119","10178","10179","10435","10551","10553","10555","10557","10559","10785","10787","13347","13349","13351","13353","13355","13357","13359"] },
  { id: "fk", name: "Friedrichshain-Kreuzberg", plz: ["10243","10245","10247","10249","10961","10963","10965","10967","10969","10997","10999"] },
  { id: "pankow", name: "Pankow", plz: ["10119","10405","10407","10409","10435","10437","10439","13086","13088","13089","13125","13127","13129","13156","13158","13159","13187","13189"] },
  { id: "cw", name: "Charlottenburg-Wilmersdorf", plz: ["10585","10587","10589","10623","10625","10627","10629","10707","10709","10711","10713","10715","10717","10719","10777","10779","10789","13627","14050","14052","14053","14055","14057","14059","14193","14197","14199"] },
  { id: "spandau", name: "Spandau", plz: ["13581","13583","13585","13587","13589","13591","13593","13595","13597","13599","13629","14089"] },
  { id: "steglitz", name: "Steglitz-Zehlendorf", plz: ["12157","12163","12165","12167","12169","12203","12205","12207","12209","12247","12249","14109","14129","14163","14165","14167","14169","14195"] },
  { id: "ts", name: "Tempelhof-Schöneberg", plz: ["10777","10779","10781","10783","10787","10789","10823","10825","10827","10829","12099","12101","12103","12105","12107","12109","12157","12159","12161","12277","12279","12305","12307","12309"] },
  { id: "neukoelln", name: "Neukölln", plz: ["12043","12045","12047","12049","12051","12053","12055","12057","12059","12347","12349","12351","12353","12355","12357","12359"] },
  { id: "tk", name: "Treptow-Köpenick", plz: ["12435","12437","12439","12459","12487","12489","12524","12526","12527","12555","12557","12559","12587","12589"] },
  { id: "marzahn", name: "Marzahn-Hellersdorf", plz: ["12619","12621","12623","12627","12629","12679","12681","12683","12685","12687","12689"] },
  { id: "lichtenberg", name: "Lichtenberg", plz: ["10315","10317","10318","10319","10365","10367","10369","13051","13053","13055","13057","13059"] },
  { id: "reinickendorf", name: "Reinickendorf", plz: ["13403","13405","13407","13409","13435","13437","13439","13465","13467","13469","13503","13505","13507","13509","13629"] },
];

const CONSTITUENCIES = [
  { id: "mitte-1", name: "Mitte 1", bezirkId: "mitte", firstVotes: { spd: 3332, cdu: 4418, gruene: 6758, linke: 2688, afd: 824, fdp: 1541 }, secondVotes: { spd: 3077, cdu: 4169, gruene: 6189, linke: 2594, afd: 822, fdp: 1625 } },
  { id: "mitte-2", name: "Mitte 2", bezirkId: "mitte", firstVotes: { spd: 4485, cdu: 5195, gruene: 4180, linke: 3478, afd: 1415, fdp: 1076 }, secondVotes: { spd: 3667, cdu: 5064, gruene: 4070, linke: 3677, afd: 1476, fdp: 1299 } },
  { id: "mitte-3", name: "Mitte 3", bezirkId: "mitte", firstVotes: { spd: 3505, cdu: 4196, gruene: 6207, linke: 2119, afd: 879, fdp: 1000 }, secondVotes: { spd: 3465, cdu: 4185, gruene: 5281, linke: 2336, afd: 875, fdp: 1151 } },
  { id: "mitte-4", name: "Mitte 4", bezirkId: "mitte", firstVotes: { spd: 2414, cdu: 2696, gruene: 6837, linke: 2987, afd: 750, fdp: 584 }, secondVotes: { spd: 2509, cdu: 2663, gruene: 5853, linke: 2866, afd: 776, fdp: 650 } },
  { id: "mitte-5", name: "Mitte 5", bezirkId: "mitte", firstVotes: { spd: 3069, cdu: 3640, gruene: 3353, linke: 2076, afd: 1280, fdp: 424 }, secondVotes: { spd: 2742, cdu: 3586, gruene: 3226, linke: 2096, afd: 1266, fdp: 470 } },
  { id: "mitte-6", name: "Mitte 6", bezirkId: "mitte", firstVotes: { spd: 2127, cdu: 1978, gruene: 4213, linke: 2773, afd: 752, fdp: 365 }, secondVotes: { spd: 1953, cdu: 1940, gruene: 3779, linke: 2829, afd: 706, fdp: 370 } },
  { id: "mitte-7", name: "Mitte 7", bezirkId: "mitte", firstVotes: { spd: 2623, cdu: 2753, gruene: 4289, linke: 2492, afd: 768, fdp: 448 }, secondVotes: { spd: 2333, cdu: 2526, gruene: 4047, linke: 2500, afd: 799, fdp: 497 } },

  { id: "fk-1", name: "Friedrichshain-Kreuzberg 1", bezirkId: "fk", firstVotes: { spd: 3161, cdu: 2814, gruene: 7422, linke: 2849, afd: 453, fdp: 617 }, secondVotes: { spd: 2963, cdu: 2629, gruene: 6822, linke: 3206, afd: 484, fdp: 692 } },
  { id: "fk-2", name: "Friedrichshain-Kreuzberg 2", bezirkId: "fk", firstVotes: { spd: 2183, cdu: 1833, gruene: 6349, linke: 4531, afd: 327, fdp: 388 }, secondVotes: { spd: 2128, cdu: 1714, gruene: 6414, linke: 4089, afd: 329, fdp: 410 } },
  { id: "fk-3", name: "Friedrichshain-Kreuzberg 3", bezirkId: "fk", firstVotes: { spd: 2879, cdu: 2381, gruene: 5634, linke: 3185, afd: 447, fdp: 356 }, secondVotes: { spd: 2539, cdu: 2310, gruene: 5294, linke: 3472, afd: 463, fdp: 383 } },
  { id: "fk-4", name: "Friedrichshain-Kreuzberg 4", bezirkId: "fk", firstVotes: { spd: 3199, cdu: 3208, gruene: 3955, linke: 4388, afd: 1222, fdp: 616 }, secondVotes: { spd: 3043, cdu: 3232, gruene: 3985, linke: 3817, afd: 1222, fdp: 642 } },
  { id: "fk-5", name: "Friedrichshain-Kreuzberg 5", bezirkId: "fk", firstVotes: { spd: 2731, cdu: 2086, gruene: 6833, linke: 4143, afd: 782, fdp: 638 }, secondVotes: { spd: 2564, cdu: 2113, gruene: 6433, linke: 4147, afd: 787, fdp: 634 } },
  { id: "fk-6", name: "Friedrichshain-Kreuzberg 6", bezirkId: "fk", firstVotes: { spd: 2519, cdu: 2408, gruene: 7525, linke: 3746, afd: 647, fdp: 708 }, secondVotes: { spd: 2445, cdu: 2319, gruene: 6957, linke: 3827, afd: 650, fdp: 797 } },

  { id: "pankow-1", name: "Pankow 1", bezirkId: "pankow", firstVotes: { spd: 3117, cdu: 9085, gruene: 1998, linke: 2205, afd: 3449, fdp: 553 }, secondVotes: { spd: 3533, cdu: 7324, gruene: 2049, linke: 2407, afd: 3711, fdp: 744 } },
  { id: "pankow-2", name: "Pankow 2", bezirkId: "pankow", firstVotes: { spd: 4297, cdu: 7057, gruene: 3439, linke: 2442, afd: 2909, fdp: 851 }, secondVotes: { spd: 3951, cdu: 6660, gruene: 3205, linke: 2678, afd: 2938, fdp: 1000 } },
  { id: "pankow-3", name: "Pankow 3", bezirkId: "pankow", firstVotes: { spd: 3434, cdu: 4479, gruene: 5628, linke: 4880, afd: 2142, fdp: 653 }, secondVotes: { spd: 3884, cdu: 4615, gruene: 5239, linke: 3787, afd: 2095, fdp: 775 } },
  { id: "pankow-4", name: "Pankow 4", bezirkId: "pankow", firstVotes: { spd: 3607, cdu: 5505, gruene: 2311, linke: 2530, afd: 2438, fdp: 515 }, secondVotes: { spd: 3291, cdu: 5274, gruene: 2215, linke: 2606, afd: 2479, fdp: 589 } },
  { id: "pankow-5", name: "Pankow 5", bezirkId: "pankow", firstVotes: { spd: 3644, cdu: 4166, gruene: 4431, linke: 3553, afd: 2124, fdp: 538 }, secondVotes: { spd: 3491, cdu: 4133, gruene: 3920, linke: 3522, afd: 2081, fdp: 619 } },
  { id: "pankow-6", name: "Pankow 6", bezirkId: "pankow", firstVotes: { spd: 2990, cdu: 2633, gruene: 8943, linke: 3927, afd: 730, fdp: 851 }, secondVotes: { spd: 2849, cdu: 2614, gruene: 8154, linke: 4131, afd: 758, fdp: 936 } },
  { id: "pankow-7", name: "Pankow 7", bezirkId: "pankow", firstVotes: { spd: 3003, cdu: 3192, gruene: 5974, linke: 3552, afd: 1390, fdp: 594 }, secondVotes: { spd: 2893, cdu: 3114, gruene: 5329, linke: 3645, afd: 1412, fdp: 693 } },
  { id: "pankow-8", name: "Pankow 8", bezirkId: "pankow", firstVotes: { spd: 2993, cdu: 2957, gruene: 7533, linke: 3676, afd: 790, fdp: 991 }, secondVotes: { spd: 2761, cdu: 2917, gruene: 6958, linke: 3784, afd: 782, fdp: 1131 } },
  { id: "pankow-9", name: "Pankow 9", bezirkId: "pankow", firstVotes: { spd: 5551, cdu: 3663, gruene: 5267, linke: 3324, afd: 1697, fdp: 675 }, secondVotes: { spd: 3811, cdu: 3848, gruene: 5341, linke: 3905, afd: 1721, fdp: 864 } },

  { id: "cw-1", name: "Charlottenburg-Wilmersdorf 1", bezirkId: "cw", firstVotes: { spd: 3694, cdu: 4489, gruene: 3366, linke: 1281, afd: 1238, fdp: 770 }, secondVotes: { spd: 3307, cdu: 4357, gruene: 3206, linke: 1406, afd: 1269, fdp: 863 } },
  { id: "cw-2", name: "Charlottenburg-Wilmersdorf 2", bezirkId: "cw", firstVotes: { spd: 4297, cdu: 8088, gruene: 4209, linke: 977, afd: 1070, fdp: 1256 }, secondVotes: { spd: 4315, cdu: 7431, gruene: 3859, linke: 1177, afd: 1124, fdp: 1681 } },
  { id: "cw-3", name: "Charlottenburg-Wilmersdorf 3", bezirkId: "cw", firstVotes: { spd: 4495, cdu: 5437, gruene: 6068, linke: 1951, afd: 839, fdp: 1025 }, secondVotes: { spd: 4303, cdu: 5014, gruene: 5680, linke: 2112, afd: 868, fdp: 1315 } },
  { id: "cw-4", name: "Charlottenburg-Wilmersdorf 4", bezirkId: "cw", firstVotes: { spd: 4570, cdu: 5848, gruene: 5321, linke: 1388, afd: 939, fdp: 1489 }, secondVotes: { spd: 4119, cdu: 5709, gruene: 4955, linke: 1684, afd: 965, fdp: 1643 } },
  { id: "cw-5", name: "Charlottenburg-Wilmersdorf 5", bezirkId: "cw", firstVotes: { spd: 3961, cdu: 8359, gruene: 3289, linke: 842, afd: 1012, fdp: 1553 }, secondVotes: { spd: 3727, cdu: 7729, gruene: 3162, linke: 1034, afd: 1070, fdp: 1951 } },
  { id: "cw-6", name: "Charlottenburg-Wilmersdorf 6", bezirkId: "cw", firstVotes: { spd: 5030, cdu: 6101, gruene: 5355, linke: 1465, afd: 887, fdp: 1126 }, secondVotes: { spd: 4526, cdu: 5773, gruene: 5070, linke: 1788, afd: 912, fdp: 1462 } },
  { id: "cw-7", name: "Charlottenburg-Wilmersdorf 7", bezirkId: "cw", firstVotes: { spd: 5325, cdu: 7638, gruene: 4701, linke: 1310, afd: 1165, fdp: 1109 }, secondVotes: { spd: 4935, cdu: 7121, gruene: 4487, linke: 1633, afd: 1231, fdp: 1409 } },

  { id: "spandau-1", name: "Spandau 1", bezirkId: "spandau", firstVotes: { spd: 4325, cdu: 6588, gruene: 1615, linke: 827, afd: 2227, fdp: 725 }, secondVotes: { spd: 3916, cdu: 6567, gruene: 1690, linke: 855, afd: 2158, fdp: 725 } },
  { id: "spandau-2", name: "Spandau 2", bezirkId: "spandau", firstVotes: { spd: 3686, cdu: 4703, gruene: 1437, linke: 724, afd: 1888, fdp: 517 }, secondVotes: { spd: 3259, cdu: 4795, gruene: 1384, linke: 787, afd: 1818, fdp: 535 } },
  { id: "spandau-3", name: "Spandau 3", bezirkId: "spandau", firstVotes: { spd: 4095, cdu: 5897, gruene: 2141, linke: 936, afd: 1898, fdp: 682 }, secondVotes: { spd: 3642, cdu: 5889, gruene: 2082, linke: 1016, afd: 1858, fdp: 776 } },
  { id: "spandau-4", name: "Spandau 4", bezirkId: "spandau", firstVotes: { spd: 4221, cdu: 8305, gruene: 1333, linke: 587, afd: 2095, fdp: 658 }, secondVotes: { spd: 3886, cdu: 8048, gruene: 1424, linke: 639, afd: 2079, fdp: 755 } },
  { id: "spandau-5", name: "Spandau 5", bezirkId: "spandau", firstVotes: { spd: 4626, cdu: 9873, gruene: 2253, linke: 564, afd: 1706, fdp: 978 }, secondVotes: { spd: 4299, cdu: 9232, gruene: 2355, linke: 692, afd: 1799, fdp: 1254 } },

  { id: "steglitz-1", name: "Steglitz-Zehlendorf 1", bezirkId: "steglitz", firstVotes: { spd: 4420, cdu: 6696, gruene: 6353, linke: 1279, afd: 1173, fdp: 1077 }, secondVotes: { spd: 4566, cdu: 6383, gruene: 5214, linke: 1680, afd: 1183, fdp: 1449 } },
  { id: "steglitz-2", name: "Steglitz-Zehlendorf 2", bezirkId: "steglitz", firstVotes: { spd: 4972, cdu: 6447, gruene: 4577, linke: 1245, afd: 1229, fdp: 1021 }, secondVotes: { spd: 4460, cdu: 6203, gruene: 4280, linke: 1450, afd: 1232, fdp: 1306 } },
  { id: "steglitz-3", name: "Steglitz-Zehlendorf 3", bezirkId: "steglitz", firstVotes: { spd: 5283, cdu: 9876, gruene: 4693, linke: 942, afd: 1161, fdp: 1446 }, secondVotes: { spd: 5015, cdu: 9034, gruene: 4412, linke: 1200, afd: 1220, fdp: 2133 } },
  { id: "steglitz-4", name: "Steglitz-Zehlendorf 4", bezirkId: "steglitz", firstVotes: { spd: 4274, cdu: 8096, gruene: 3038, linke: 851, afd: 1294, fdp: 1032 }, secondVotes: { spd: 4075, cdu: 7579, gruene: 2882, linke: 905, afd: 1278, fdp: 1346 } },
  { id: "steglitz-5", name: "Steglitz-Zehlendorf 5", bezirkId: "steglitz", firstVotes: { spd: 3997, cdu: 7732, gruene: 2766, linke: 764, afd: 1492, fdp: 891 }, secondVotes: { spd: 3867, cdu: 7201, gruene: 2530, linke: 923, afd: 1543, fdp: 1185 } },
  { id: "steglitz-6", name: "Steglitz-Zehlendorf 6", bezirkId: "steglitz", firstVotes: { spd: 4658, cdu: 9338, gruene: 4763, linke: 981, afd: 1073, fdp: 1593 }, secondVotes: { spd: 4400, cdu: 8546, gruene: 4480, linke: 1251, afd: 1132, fdp: 2215 } },
  { id: "steglitz-7", name: "Steglitz-Zehlendorf 7", bezirkId: "steglitz", firstVotes: { spd: 4161, cdu: 9003, gruene: 4458, linke: 698, afd: 994, fdp: 2297 }, secondVotes: { spd: 4204, cdu: 8626, gruene: 4078, linke: 915, afd: 1077, fdp: 2409 } },

  { id: "ts-1", name: "Tempelhof-Schöneberg 1", bezirkId: "ts", firstVotes: { spd: 4480, cdu: 4719, gruene: 7370, linke: 2371, afd: 828, fdp: 880 }, secondVotes: { spd: 4135, cdu: 4529, gruene: 6680, linke: 2644, afd: 864, fdp: 1012 } },
  { id: "ts-2", name: "Tempelhof-Schöneberg 2", bezirkId: "ts", firstVotes: { spd: 4677, cdu: 3759, gruene: 7830, linke: 2426, afd: 774, fdp: 633 }, secondVotes: { spd: 4120, cdu: 3672, gruene: 7311, linke: 2878, afd: 785, fdp: 788 } },
  { id: "ts-3", name: "Tempelhof-Schöneberg 3", bezirkId: "ts", firstVotes: { spd: 7742, cdu: 5551, gruene: 6462, linke: 1483, afd: 881, fdp: 829 }, secondVotes: { spd: 5280, cdu: 5539, gruene: 7239, linke: 2198, afd: 953, fdp: 1126 } },
  { id: "ts-4", name: "Tempelhof-Schöneberg 4", bezirkId: "ts", firstVotes: { spd: 4146, cdu: 5880, gruene: 5462, linke: 1837, afd: 1206, fdp: 708 }, secondVotes: { spd: 3955, cdu: 5754, gruene: 4822, linke: 2106, afd: 1211, fdp: 812 } },
  { id: "ts-5", name: "Tempelhof-Schöneberg 5", bezirkId: "ts", firstVotes: { spd: 4288, cdu: 7768, gruene: 2404, linke: 1208, afd: 1679, fdp: 784 }, secondVotes: { spd: 3915, cdu: 7423, gruene: 2334, linke: 1233, afd: 1669, fdp: 951 } },
  { id: "ts-6", name: "Tempelhof-Schöneberg 6", bezirkId: "ts", firstVotes: { spd: 4081, cdu: 9345, gruene: 1891, linke: 720, afd: 1882, fdp: 808 }, secondVotes: { spd: 3935, cdu: 8987, gruene: 1787, linke: 746, afd: 1887, fdp: 944 } },
  { id: "ts-7", name: "Tempelhof-Schöneberg 7", bezirkId: "ts", firstVotes: { spd: 4154, cdu: 10546, gruene: 2050, linke: 684, afd: 1890, fdp: 926 }, secondVotes: { spd: 4081, cdu: 10071, gruene: 1925, linke: 762, afd: 1895, fdp: 1147 } },

  { id: "neukoelln-1", name: "Neukölln 1", bezirkId: "neukoelln", firstVotes: { spd: 2823, cdu: 2021, gruene: 6661, linke: 4981, afd: 650, fdp: 295 }, secondVotes: { spd: 2733, cdu: 1957, gruene: 6721, linke: 4713, afd: 645, fdp: 343 } },
  { id: "neukoelln-2", name: "Neukölln 2", bezirkId: "neukoelln", firstVotes: { spd: 2599, cdu: 1891, gruene: 6123, linke: 5458, afd: 638, fdp: 0 }, secondVotes: { spd: 2545, cdu: 1725, gruene: 6378, linke: 4575, afd: 599, fdp: 323 } },
  { id: "neukoelln-3", name: "Neukölln 3", bezirkId: "neukoelln", firstVotes: { spd: 3739, cdu: 3351, gruene: 3367, linke: 3023, afd: 1079, fdp: 370 }, secondVotes: { spd: 3251, cdu: 3201, gruene: 3651, linke: 2818, afd: 1047, fdp: 397 } },
  { id: "neukoelln-4", name: "Neukölln 4", bezirkId: "neukoelln", firstVotes: { spd: 5165, cdu: 7477, gruene: 876, linke: 748, afd: 1827, fdp: 533 }, secondVotes: { spd: 4782, cdu: 7153, gruene: 907, linke: 801, afd: 1850, fdp: 627 } },
  { id: "neukoelln-5", name: "Neukölln 5", bezirkId: "neukoelln", firstVotes: { spd: 5014, cdu: 8682, gruene: 1610, linke: 955, afd: 2006, fdp: 729 }, secondVotes: { spd: 5101, cdu: 8136, gruene: 1706, linke: 889, afd: 1989, fdp: 895 } },
  { id: "neukoelln-6", name: "Neukölln 6", bezirkId: "neukoelln", firstVotes: { spd: 5994, cdu: 9190, gruene: 1044, linke: 735, afd: 2109, fdp: 733 }, secondVotes: { spd: 5123, cdu: 8929, gruene: 1146, linke: 726, afd: 2195, fdp: 852 } },

  { id: "tk-1", name: "Treptow-Köpenick 1", bezirkId: "tk", firstVotes: { spd: 3492, cdu: 4120, gruene: 4215, linke: 5670, afd: 2142, fdp: 593 }, secondVotes: { spd: 3452, cdu: 4013, gruene: 4672, linke: 4580, afd: 2137, fdp: 678 } },
  { id: "tk-2", name: "Treptow-Köpenick 2", bezirkId: "tk", firstVotes: { spd: 6277, cdu: 4513, gruene: 2297, linke: 3477, afd: 2923, fdp: 619 }, secondVotes: { spd: 4403, cdu: 4768, gruene: 2682, linke: 3539, afd: 2915, fdp: 729 } },
  { id: "tk-3", name: "Treptow-Köpenick 3", bezirkId: "tk", firstVotes: { spd: 4082, cdu: 7022, gruene: 1849, linke: 2560, afd: 3656, fdp: 703 }, secondVotes: { spd: 3733, cdu: 6587, gruene: 1863, linke: 2625, afd: 3651, fdp: 773 } },
  { id: "tk-4", name: "Treptow-Köpenick 4", bezirkId: "tk", firstVotes: { spd: 5538, cdu: 6386, gruene: 2359, linke: 3275, afd: 3232, fdp: 854 }, secondVotes: { spd: 4212, cdu: 6656, gruene: 2600, linke: 3401, afd: 3261, fdp: 1011 } },
  { id: "tk-5", name: "Treptow-Köpenick 5", bezirkId: "tk", firstVotes: { spd: 4279, cdu: 5180, gruene: 1294, linke: 2792, afd: 3378, fdp: 625 }, secondVotes: { spd: 3532, cdu: 5165, gruene: 1313, linke: 2777, afd: 3297, fdp: 768 } },
  { id: "tk-6", name: "Treptow-Köpenick 6", bezirkId: "tk", firstVotes: { spd: 4268, cdu: 7306, gruene: 2700, linke: 4158, afd: 2768, fdp: 750 }, secondVotes: { spd: 4114, cdu: 6722, gruene: 2800, linke: 3748, afd: 2829, fdp: 831 } },

  { id: "marzahn-1", name: "Marzahn-Hellersdorf 1", bezirkId: "marzahn", firstVotes: { spd: 2366, cdu: 3013, gruene: 419, linke: 2499, afd: 3945, fdp: 271 }, secondVotes: { spd: 2059, cdu: 3143, gruene: 482, linke: 2185, afd: 3835, fdp: 304 } },
  { id: "marzahn-2", name: "Marzahn-Hellersdorf 2", bezirkId: "marzahn", firstVotes: { spd: 3242, cdu: 4353, gruene: 696, linke: 3456, afd: 3580, fdp: 473 }, secondVotes: { spd: 3088, cdu: 4594, gruene: 707, linke: 2993, afd: 3495, fdp: 432 } },
  { id: "marzahn-3", name: "Marzahn-Hellersdorf 3", bezirkId: "marzahn", firstVotes: { spd: 2318, cdu: 3692, gruene: 593, linke: 2552, afd: 3865, fdp: 422 }, secondVotes: { spd: 2237, cdu: 3671, gruene: 643, linke: 2217, afd: 3765, fdp: 403 } },
  { id: "marzahn-4", name: "Marzahn-Hellersdorf 4", bezirkId: "marzahn", firstVotes: { spd: 2814, cdu: 9494, gruene: 1582, linke: 3314, afd: 3116, fdp: 498 }, secondVotes: { spd: 3469, cdu: 8072, gruene: 1508, linke: 3187, afd: 3251, fdp: 668 } },
  { id: "marzahn-5", name: "Marzahn-Hellersdorf 5", bezirkId: "marzahn", firstVotes: { spd: 3909, cdu: 11446, gruene: 1814, linke: 2952, afd: 3212, fdp: 797 }, secondVotes: { spd: 4123, cdu: 10196, gruene: 1904, linke: 2934, afd: 3377, fdp: 1029 } },
  { id: "marzahn-6", name: "Marzahn-Hellersdorf 6", bezirkId: "marzahn", firstVotes: { spd: 2283, cdu: 6131, gruene: 720, linke: 2470, afd: 3147, fdp: 320 }, secondVotes: { spd: 2480, cdu: 5171, gruene: 812, linke: 2316, afd: 3276, fdp: 417 } },

  { id: "lichtenberg-1", name: "Lichtenberg 1", bezirkId: "lichtenberg", firstVotes: { spd: 2175, cdu: 7159, gruene: 672, linke: 2694, afd: 3501, fdp: 332 }, secondVotes: { spd: 2461, cdu: 6084, gruene: 703, linke: 2521, afd: 3669, fdp: 369 } },
  { id: "lichtenberg-2", name: "Lichtenberg 2", bezirkId: "lichtenberg", firstVotes: { spd: 2853, cdu: 7762, gruene: 1279, linke: 3324, afd: 2906, fdp: 447 }, secondVotes: { spd: 2943, cdu: 6820, gruene: 1357, linke: 3129, afd: 3014, fdp: 563 } },
  { id: "lichtenberg-3", name: "Lichtenberg 3", bezirkId: "lichtenberg", firstVotes: { spd: 3442, cdu: 4254, gruene: 1606, linke: 4244, afd: 2661, fdp: 586 }, secondVotes: { spd: 3361, cdu: 4200, gruene: 1642, linke: 3539, afd: 2646, fdp: 560 } },
  { id: "lichtenberg-4", name: "Lichtenberg 4", bezirkId: "lichtenberg", firstVotes: { spd: 3696, cdu: 3783, gruene: 3296, linke: 5399, afd: 2172, fdp: 0 }, secondVotes: { spd: 3346, cdu: 3572, gruene: 3443, linke: 4355, afd: 2127, fdp: 599 } },
  { id: "lichtenberg-5", name: "Lichtenberg 5", bezirkId: "lichtenberg", firstVotes: { spd: 3203, cdu: 3900, gruene: 2791, linke: 4928, afd: 2588, fdp: 545 }, secondVotes: { spd: 3140, cdu: 3919, gruene: 2959, linke: 4139, afd: 2518, fdp: 582 } },
  { id: "lichtenberg-6", name: "Lichtenberg 6", bezirkId: "lichtenberg", firstVotes: { spd: 4174, cdu: 4807, gruene: 3496, linke: 4669, afd: 2130, fdp: 742 }, secondVotes: { spd: 3707, cdu: 4996, gruene: 3585, linke: 3972, afd: 2141, fdp: 853 } },

  { id: "reinickendorf-1", name: "Reinickendorf 1", bezirkId: "reinickendorf", firstVotes: { spd: 3128, cdu: 5056, gruene: 1480, linke: 1155, afd: 1571, fdp: 348 }, secondVotes: { spd: 2653, cdu: 4743, gruene: 1727, linke: 1131, afd: 1614, fdp: 412 } },
  { id: "reinickendorf-2", name: "Reinickendorf 2", bezirkId: "reinickendorf", firstVotes: { spd: 3476, cdu: 5928, gruene: 1369, linke: 772, afd: 2018, fdp: 585 }, secondVotes: { spd: 3120, cdu: 5798, gruene: 1454, linke: 824, afd: 1979, fdp: 601 } },
  { id: "reinickendorf-3", name: "Reinickendorf 3", bezirkId: "reinickendorf", firstVotes: { spd: 4736, cdu: 9348, gruene: 2637, linke: 616, afd: 1737, fdp: 998 }, secondVotes: { spd: 4391, cdu: 8848, gruene: 2731, linke: 729, afd: 1771, fdp: 1256 } },
  { id: "reinickendorf-4", name: "Reinickendorf 4", bezirkId: "reinickendorf", firstVotes: { spd: 4915, cdu: 8709, gruene: 2447, linke: 696, afd: 2066, fdp: 901 }, secondVotes: { spd: 4360, cdu: 8342, gruene: 2606, linke: 864, afd: 2089, fdp: 1011 } },
  { id: "reinickendorf-5", name: "Reinickendorf 5", bezirkId: "reinickendorf", firstVotes: { spd: 2934, cdu: 5702, gruene: 835, linke: 506, afd: 1838, fdp: 407 }, secondVotes: { spd: 2846, cdu: 5356, gruene: 867, linke: 504, afd: 1876, fdp: 497 } },
  { id: "reinickendorf-6", name: "Reinickendorf 6", bezirkId: "reinickendorf", firstVotes: { spd: 4396, cdu: 9889, gruene: 3615, linke: 510, afd: 1230, fdp: 1110 }, secondVotes: { spd: 4118, cdu: 9530, gruene: 3307, linke: 753, afd: 1301, fdp: 1470 } },
];
