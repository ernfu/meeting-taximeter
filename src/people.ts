export type Role = "ceo" | "coo" | "cco" | "cfo" | "cstat" | "csci" | "cdev" | "hds" | "heng" | "htp" | "hmkt" | "vpsales" | "revops" | "mktex" | "ea" | "smsp" | "ds" | "jds" | "da" | "ca" | "sse" | "ssysops" | "sdev" | "jfd";

// random guess from https://lnkd.in/p/gusW6sFU
export const ROLE_SALARY: Record<Role, number> = {
  ceo:     250000,
  coo:     200000,
  cco:     200000,
  cfo:     200000,
  cstat:   200000,
  csci:    200000,
  cdev:    200000,

  hds:     180000,
  heng:    200000,
  htp:     150000,
  hmkt:    150000,

  vpsales: 180000,
  revops:  140000,
  mktex:    90000,
  ea:       90000,

  smsp:    140000,
  ds:      130000,
  jds:     100000,
  da:      110000,
  ca:      100000,

  sse:     160000,
  ssysops: 150000,
  sdev:    150000,
  jfd:      90000,
};


export const PEOPLE: Record<string, Role> = {
  "Jordie":  "ceo",
  "Rafi":    "cfo",
  "Bec":     "htp",
  "Lauren":  "ea",

  "Pat":     "csci",
  "John":    "cstat",
  "Ernest":  "ds",
  "Jed":     "jds",

  "Matt":    "heng",
  "Aysa":    "sse",
  "Tong":    "ssysops",
  "Ramon":   "da",
  "Tra":     "da",

  "Hamish":  "coo",
  "Rachel":  "hds",
  "Lachie":  "smsp",
  "Becky":   "ca",
  "Carl":    "ca",

  "Clyde":   "cdev",
  "Michael": "sdev",
  "Ruxin":   "jfd",

  "Paul":    "cco",
  "James":   "vpsales",
  "Leo":     "revops",

  "Eimear":  "hmkt",
  "Lia":     "mktex",
};