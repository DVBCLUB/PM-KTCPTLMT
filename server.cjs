var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_vite = require("vite");
var tempDbPath = import_path.default.join(process.cwd(), "database.json");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var defaultDatabase = {
  expenses: [
    {
      id: "exp-1",
      requestDate: "2026-03-20",
      actualDate: "2026-03-20",
      content: "Chi ph\xED thu\xEA xe \xF4 t\xF4 ch\u1EDF Thoa \u0111i t\u1EEB CT-\u0110H xu\u1ED1ng d\u1EF1 \xE1n HCM-TL-MT",
      expenseGroup: "Qu\u1EA3n l\xFD DN/C\xF4ng tr\xECnh (642,627)" /* PROJECT_MGMT */,
      expenseType: "V\u1EADn chuy\u1EC3n" /* SHIPPING */,
      advanceAmount: 1e6,
      actualAmount: 1e6,
      limitType: "0",
      clearanceStatus: "Xong",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "",
      notes: "\u0110\xE3 ho\xE0n \u1EE9ng",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-20T08:00:00Z")).toISOString()
    },
    {
      id: "exp-2",
      requestDate: "2026-03-21",
      actualDate: "2026-03-21",
      content: "Thu\xEA ph\xF2ng thanh to\xE1n \u0111\u1EBFn ng\xE0y 21/03",
      expenseGroup: "Qu\u1EA3n l\xFD DN/C\xF4ng tr\xECnh (642,627)" /* PROJECT_MGMT */,
      expenseType: "C\xF4ng t\xE1c ph\xED" /* TRAVEL */,
      advanceAmount: 0,
      actualAmount: 3525e3,
      limitType: "Theo th\u1EF1c t\u1EBF",
      clearanceStatus: "\u0110ang ho\xE0n \u1EE9ng",
      documentStatus: "Thi\u1EBFu ch\u1EE9ng t\u1EEB",
      missingDocuments: "Ch\u01B0a n\u1ED9p h\xF3a \u0111\u01A1n ph\xF2ng ngh\u1EC9",
      invoiceNo: "",
      notes: "Qu\xE1 h\u1EA1n 57 ng\xE0y",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T08:30:00Z")).toISOString()
    },
    {
      id: "exp-3",
      requestDate: "2026-03-21",
      actualDate: "2026-03-21",
      content: "Mua xe m\xE1y 2 chi\u1EBFc ph\u1EE5c v\u1EE5 hi\u1EC7n tr\u01B0\u1EDDng",
      expenseGroup: "Qu\u1EA3n l\xFD DN/C\xF4ng tr\xECnh (642,627)" /* PROJECT_MGMT */,
      expenseType: "H\xE0nh ch\xEDnh" /* ADMIN */,
      advanceAmount: 2e7,
      actualAmount: 2e7,
      limitType: "0",
      clearanceStatus: "\u0110ang ho\xE0n \u1EE9ng",
      documentStatus: "Thi\u1EBFu ch\u1EE9ng t\u1EEB",
      missingDocuments: "H\xF3a \u0111\u01A1n VAT v\xE0 gi\u1EA5y \u0111\u0103ng k\xFD xe",
      invoiceNo: "",
      notes: "Qu\xE1 h\u1EA1n 57 ng\xE0y",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T09:00:00Z")).toISOString()
    },
    {
      id: "exp-4",
      requestDate: "2026-03-21",
      actualDate: "2026-03-21",
      content: "Thanh to\xE1n ti\u1EC1n c\u01A1m c\u1EE7a Tr\u1EA7n Kh\u1EAFc Trung v\xE0 A Ki\xEAn t\u1EA1i hi\u1EC7n b\xE3i",
      expenseGroup: "Qu\u1EA3n l\xFD DN/C\xF4ng tr\xECnh (642,627)" /* PROJECT_MGMT */,
      expenseType: "B\u1EBFp \u0103n" /* KITCHEN */,
      advanceAmount: 168e4,
      actualAmount: 168e4,
      limitType: "60k/ng\u01B0\u1EDDi",
      clearanceStatus: "\u0110ang ho\xE0n \u1EE9ng",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "",
      notes: "B\u1EBFp \u0103n c\xF4ng tr\xECnh/\u0102n ngo\xE0i (627)",
      createdByRole: "H\xE0nh ch\xEDnh nh\xE2n s\u1EF1 (HCNS)" /* HCNS */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T10:00:00Z")).toISOString()
    },
    {
      id: "exp-5",
      requestDate: "2026-03-21",
      actualDate: "2026-03-21",
      content: "Thanh to\xE1n chi ph\xED mua 100 l\xEDt d\u1EA7u Do 0.05S-II",
      expenseGroup: "Chi ph\xED thi c\xF4ng (621,622,623)" /* CONSTRUCTION */,
      expenseType: "D\u1EA7u (621)" /* FUEL */,
      advanceAmount: 3342e3,
      actualAmount: 3342e3,
      limitType: "Theo \u0111\u1ECBnh m\u1EE9c",
      clearanceStatus: "Xong",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "18109 vs 18110",
      notes: "D\u1EA7u (621) - \u0110\xE3 nh\u1EADp kho d\u1EA7u",
      createdByRole: "Th\u1EE7 kho" /* STOREKEEPER */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T11:00:00Z")).toISOString()
    },
    {
      id: "exp-6",
      requestDate: "2026-03-25",
      actualDate: "2026-03-25",
      content: "Thanh to\xE1n ti\u1EC1n x\u0103ng 51M97730 Fortuner ch\u1EDF s\u1EBFp Tu\u1EA5n v\u1EC1 SG",
      expenseGroup: "Chi ph\xED thi c\xF4ng (621,622,623)" /* CONSTRUCTION */,
      expenseType: "D\u1EA7u (621)" /* FUEL */,
      advanceAmount: 5e5,
      actualAmount: 5e5,
      limitType: "Theo \u0111\u1ECBnh m\u1EE9c",
      clearanceStatus: "Xong",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "637268",
      notes: "\u0110\xE3 ho\xE0n \u1EE9ng",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-25T08:00:00Z")).toISOString()
    },
    {
      id: "exp-7",
      requestDate: "2026-03-26",
      actualDate: "2026-03-26",
      content: "Thanh to\xE1n ti\u1EC1n mua 50 l\xEDt d\u1EA7u c\u1EA5p m\xE1y \u0111\xE0o 07 l\xE0m m\u1EB7t b\u1EB1ng b\xE3i d\u1EA7m",
      expenseGroup: "Chi ph\xED thi c\xF4ng (621,622,623)" /* CONSTRUCTION */,
      expenseType: "D\u1EA7u (621)" /* FUEL */,
      advanceAmount: 1000200,
      actualAmount: 1000200,
      limitType: "Theo \u0111\u1ECBnh m\u1EE9c",
      clearanceStatus: "\u0110ang ho\xE0n \u1EE9ng",
      documentStatus: "Thi\u1EBFu ch\u1EE9ng t\u1EEB",
      missingDocuments: "Thi\u1EBFu h\xF3a \u0111\u01A1n l\u1EBB",
      invoiceNo: "19658",
      notes: "H\u1EA1ch to\xE1n l\u1EC7ch 55,700\u0111",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-26T08:30:00Z")).toISOString()
    },
    {
      id: "exp-8",
      requestDate: "2026-03-26",
      actualDate: "2026-03-26",
      content: "Thanh to\xE1n ti\u1EC1n \u0111\u1ED5 x\u0103ng xe Fotuner \u0111\u1EC3 s\u1EBFp Th\u1EA1ch v\u1EC1 SG",
      expenseGroup: "Chi ph\xED thi c\xF4ng (621,622,623)" /* CONSTRUCTION */,
      expenseType: "D\u1EA7u (621)" /* FUEL */,
      advanceAmount: 95e4,
      actualAmount: 95e4,
      limitType: "Theo \u0111\u1ECBnh m\u1EE9c",
      clearanceStatus: "\u0110ang ho\xE0n \u1EE9ng",
      documentStatus: "Thi\u1EBFu ch\u1EE9ng t\u1EEB",
      missingDocuments: "Thi\u1EBFu h\xF3a \u0111\u01A1n g\u1ED1c",
      invoiceNo: "19659",
      notes: "\u0110\u01B0\u1EE3c duy\u1EC7t t\u1EA1m \u1EE9ng",
      createdByRole: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      createdAt: (/* @__PURE__ */ new Date("2026-03-26T09:00:00Z")).toISOString()
    },
    {
      id: "exp-9",
      requestDate: "2026-04-01",
      actualDate: "2026-04-01",
      content: "Chi ph\xED thu\xEA xe Lalamove chuy\u1EC3n m\xE1y l\u1EA1nh v\xE0 \u0111\u1ED3 xu\u1ED1ng v\u0103n ph\xF2ng d\u1EF1 \xE1n",
      expenseGroup: "Qu\u1EA3n l\xFD DN/C\xF4ng tr\xECnh (642,627)" /* PROJECT_MGMT */,
      expenseType: "V\u1EADn chuy\u1EC3n" /* SHIPPING */,
      advanceAmount: 12e5,
      actualAmount: 12e5,
      limitType: "0",
      clearanceStatus: "Xong",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "LLM-29938",
      notes: "Chuy\u1EC3n m\xE1y l\u1EA1nh v\u0103n ph\xF2ng B\u0110H",
      createdByRole: "H\xE0nh ch\xEDnh nh\xE2n s\u1EF1 (HCNS)" /* HCNS */,
      createdAt: (/* @__PURE__ */ new Date("2026-04-01T10:00:00Z")).toISOString()
    },
    {
      id: "exp-10",
      requestDate: "2026-04-04",
      actualDate: "2026-04-04",
      content: "Thanh to\xE1n ti\u1EC1n mua d\u1EA7u c\u1EA5p 50 l\xEDt cho m\xE1y \u0111\xE0o 09 thi c\xF4ng b\xE3i \u0111\xFAc d\u1EA7m",
      expenseGroup: "Chi ph\xED thi c\xF4ng (621,622,623)" /* CONSTRUCTION */,
      expenseType: "D\u1EA7u (621)" /* FUEL */,
      advanceAmount: 2239e3,
      actualAmount: 2239e3,
      limitType: "Theo \u0111\u1ECBnh m\u1EE9c",
      clearanceStatus: "Xong",
      documentStatus: "\u0110\u1EA7y \u0111\u1EE7",
      missingDocuments: "",
      invoiceNo: "31969",
      notes: "\u0110\xE3 chi v\xE0 ho\xE0n \u1EE9ng",
      createdByRole: "Th\u1EE7 kho" /* STOREKEEPER */,
      createdAt: (/* @__PURE__ */ new Date("2026-04-04T08:00:00Z")).toISOString()
    }
  ],
  funds: [
    {
      id: "f-1",
      date: "2026-03-21",
      content: "S\u1ED1 ti\u1EC1n t\u1EA1m \u1EE9ng ban \u0111\u1EA7u c\u1EA5p cho qu\u1EF9 HCNS t\u1EEB C\xF4ng ty",
      amount: 7627e4,
      source: "Ng\xE2n s\xE1ch",
      notes: "Nh\u1EADp ban \u0111\u1EA7u cho ho\u1EA1t \u0111\u1ED9ng v\u0103n ph\xF2ng",
      fundType: "HCNS",
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T07:00:00Z")).toISOString()
    },
    {
      id: "f-2",
      date: "2026-03-25",
      content: "Nh\u1EADp qu\u1EF9 mua d\u1EA7u t\u1EEB c\xF4ng ty \u0111\u1EE3t 1",
      amount: 40896e3,
      source: "Ng\xE2n s\xE1ch",
      notes: "Ph\u1EE5c v\u1EE5 nhi\xEAn li\u1EC7u thi c\xF4ng m\xE1y c\xF4ng tr\xECnh",
      fundType: "D\u1EA7u",
      createdAt: (/* @__PURE__ */ new Date("2026-03-25T07:15:00Z")).toISOString()
    },
    {
      id: "f-3",
      date: "2026-04-03",
      content: "M\u01B0\u1EE3n qu\u1EF9 B\u0110H t\u1EEB s\u1EBFp Th\u1EA1ch \u0111\u1ED5 d\u1EA7u kh\u1EA9n c\u1EA5p",
      amount: 1e7,
      source: "M\u01B0\u1EE3n s\u1EBFp",
      notes: "S\u1EBFp Th\u1EA1ch c\u1EA5p m\u01B0\u1EE3n tr\u1EF1c ti\u1EBFp",
      fundType: "D\u1EA7u",
      createdAt: (/* @__PURE__ */ new Date("2026-04-03T09:00:00Z")).toISOString()
    },
    {
      id: "f-4",
      date: "2026-04-05",
      content: "M\u01B0\u1EE3n qu\u1EF9 B\u0110H t\u1EEB s\u1EBFp Th\u1EA1ch mua d\u1EA7u v\xE0 v\u1EADt t\u01B0 kh\u1EA9n c\u1EA5p \u0111\u1EE3t 2",
      amount: 1e7,
      source: "M\u01B0\u1EE3n s\u1EBFp",
      notes: "C\u1EA5p ti\u1EC1n m\u1EB7t",
      fundType: "D\u1EA7u",
      createdAt: (/* @__PURE__ */ new Date("2026-04-05T09:30:00Z")).toISOString()
    },
    {
      id: "f-5",
      date: "2026-04-06",
      content: "Nh\u1EADp qu\u1EF9 mua d\u1EA7u t\u1EEB c\xF4ng ty \u0111\u1EE3t 2",
      amount: 5e7,
      source: "Ng\xE2n s\xE1ch",
      notes: "Chuy\u1EC3n kho\u1EA3n c\xF4ng ty c\u1EA5p qu\u1EF9",
      fundType: "D\u1EA7u",
      createdAt: (/* @__PURE__ */ new Date("2026-04-06T08:00:00Z")).toISOString()
    },
    {
      id: "f-6",
      date: "2026-04-08",
      content: "T\u1EA1m \u1EE9ng \u0111\u1EE3t 2 cho qu\u1EF9 h\xE0nh ch\xEDnh nh\xE2n s\u1EF1 HCNS",
      amount: 3e7,
      source: "Ng\xE2n s\xE1ch",
      notes: "Nh\u1EADp qu\u1EF9 v\u0103n ph\xF2ng",
      fundType: "HCNS",
      createdAt: (/* @__PURE__ */ new Date("2026-04-08T08:00:00Z")).toISOString()
    },
    {
      id: "f-7",
      date: "2026-04-14",
      content: "Nh\u1EADp qu\u1EF9 mua d\u1EA7u t\u1EEB c\xF4ng ty \u0111\u1EE3t 3",
      amount: 39184e3,
      source: "Ng\xE2n s\xE1ch",
      notes: "D\u1EA7u ph\u1EE5c v\u1EE5 \u0111\u1ED5 m\xE1y \u0111\xE0o 07 & 09",
      fundType: "D\u1EA7u",
      createdAt: (/* @__PURE__ */ new Date("2026-04-14T08:00:00Z")).toISOString()
    },
    {
      id: "f-8",
      date: "2026-04-20",
      content: "T\u1EA1m \u1EE9ng qu\u1EF9 HCNS \u0111\u1EE3t 3",
      amount: 66e6,
      source: "Ng\xE2n s\xE1ch",
      notes: "B\u1EBFp \u0103n v\xE0 sinh ho\u1EA1t",
      fundType: "HCNS",
      createdAt: (/* @__PURE__ */ new Date("2026-04-20T08:00:00Z")).toISOString()
    },
    {
      id: "f-9",
      date: "2026-04-29",
      content: "T\u1EA1m \u1EE9ng h\xE0nh ch\xEDnh \u0111\u1EE3t 4 (Qu\u1EF9 HCNS)",
      amount: 3e7,
      source: "Ng\xE2n s\xE1ch",
      notes: "H\u1EA1ch to\xE1n \u0111\u1EE3t cu\u1ED1i th\xE1ng 4",
      fundType: "HCNS",
      createdAt: (/* @__PURE__ */ new Date("2026-04-29T10:00:00Z")).toISOString()
    }
  ],
  documents: [
    {
      id: "doc-1",
      code: "HD-001",
      name: "H\u1EE3p \u0111\u1ED3ng thu\xEA xe \xF4 t\xF4 \u0111\u01B0a \u0111\xF3n ch\u1EC9 huy d\u1EF1 \xE1n",
      expenseId: "exp-1",
      category: "H\u1EE3p \u0111\u1ED3ng",
      status: "Ho\xE0n t\u1EA5t",
      updatedAt: "2026-03-20",
      assignedTo: "H\xE0nh ch\xEDnh nh\xE2n s\u1EF1 (HCNS)" /* HCNS */,
      notes: "K\xFD k\u1EBFt c\xF9ng nh\xE0 xe Th\u1EAFng L\u1EE3i"
    },
    {
      id: "doc-2",
      code: "HDD-18109",
      name: "Bi\xEAn b\u1EA3n nghi\u1EC7m thu c\u1EA5p d\u1EA7u \u0111\u1EE3t 1 - H\u0110 18109",
      expenseId: "exp-5",
      category: "Bi\xEAn b\u1EA3n b\xE0n giao",
      status: "\u0110\xE3 k\xFD duy\u1EC7t",
      updatedAt: "2026-03-21",
      assignedTo: "Th\u1EE7 kho" /* STOREKEEPER */,
      notes: "Th\u1EE7 kho l\u01B0u h\u1ED3 s\u01A1 gi\u1EA5y t\u1EA1i v\u0103n ph\xF2ng"
    },
    {
      id: "doc-3",
      code: "VAT-3525",
      name: "Y\xEAu c\u1EA7u xu\u1EA5t h\xF3a \u0111\u01A1n \u0111\u1ECF chi ph\xED thu\xEA ph\xF2ng t\u1EDBi 21/03",
      expenseId: "exp-2",
      category: "H\xF3a \u0111\u01A1n",
      status: "Tr\xECnh k\xFD",
      updatedAt: "2026-04-05",
      assignedTo: "K\u1EBF to\xE1n d\u1EF1 \xE1n" /* ACCOUNTANT */,
      notes: "\u0110ang h\u1ED1i th\xFAc kh\xE1ch s\u1EA1n \u1EDF Cai L\u1EADy ho\xE0n thi\u1EC7n h\xF3a \u0111\u01A1n"
    },
    {
      id: "doc-4",
      code: "HS-XE-01",
      name: "H\u1ED3 s\u01A1 ph\xE1p l\xFD mua 02 xe m\xE1y hi\u1EC7n tr\u01B0\u1EDDng",
      expenseId: "exp-3",
      category: "Kh\xE1c",
      status: "So\u1EA1n th\u1EA3o",
      updatedAt: "2026-03-25",
      assignedTo: "H\xE0nh ch\xEDnh nh\xE2n s\u1EF1 (HCNS)" /* HCNS */,
      notes: "Ch\u01B0a nh\u1EADn \u0111\u01B0\u1EE3c gi\u1EA5y \u0111\u0103ng k\xFD xe t\u1EEB \u0111\u01A1n v\u1ECB b\xE1n"
    }
  ],
  materials: [
    {
      id: "mat-1",
      code: "D\u1EA6U-DO",
      name: "D\u1EA7u Diesel 0.05S-II",
      unit: "L\xEDt",
      minStock: 500,
      description: "D\u1EA7u ph\u1EE5c v\u1EE5 m\xE1y \u0111\xE0o, m\xE1y ph\xE1t \u0111i\u1EC7n, lu rung hi\u1EC7n tr\u01B0\u1EDDng"
    },
    {
      id: "mat-2",
      code: "XM-PCB40",
      name: "Xi m\u0103ng PCB40 H\xE0 Ti\xEAn",
      unit: "Bao (50kg)",
      minStock: 100,
      description: "Ph\u1EE5c v\u1EE5 \u0111\xFAc d\u1EA7m v\xE0 c\xE1c h\u1EA1ng m\u1EE5c ph\u1EE5 tr\u1EE3"
    },
    {
      id: "mat-3",
      code: "TH\xC9P-D16",
      name: "Th\xE9p thanh v\u1EB1n H\xF2a Ph\xE1t D16",
      unit: "T\u1EA5n",
      minStock: 2,
      description: "C\u1ED1t th\xE9p gia c\u01B0\u1EDDng s\xE0n d\u1EA7m"
    },
    {
      id: "mat-4",
      code: "N\xD3N-BHL\u0110",
      name: "N\xF3n b\u1EA3o h\u1ED9 lao \u0111\u1ED9ng Th\xF9y D\u01B0\u01A1ng",
      unit: "C\xE1i",
      minStock: 20,
      description: "N\xF3n nh\u1EF1a trang b\u1ECB cho k\u1EF9 s\u01B0 v\xE0 c\xF4ng nh\xE2n"
    }
  ],
  inventoryTransactions: [
    {
      id: "tx-1",
      materialId: "mat-1",
      type: "NH\u1EACP",
      date: "2026-03-21",
      quantity: 100,
      unitPrice: 33420,
      totalPrice: 3342e3,
      reference: "PN-01/DAU",
      person: "\u0110\xE0o V\u0103n Ph\xFA (Th\u1EE7 kho)",
      notes: "Nh\u1EADp kho d\u1EA7u tr\u1EA1m ch\xEDnh d\u1EA7m t\u1EEB h\xF3a \u0111\u01A1n 18109",
      createdAt: (/* @__PURE__ */ new Date("2026-03-21T11:00:00Z")).toISOString()
    },
    {
      id: "tx-2",
      materialId: "mat-1",
      type: "XU\u1EA4T",
      date: "2026-03-24",
      quantity: 50,
      unitPrice: 33420,
      totalPrice: 1671e3,
      reference: "PX-01/DAU",
      person: "K\u1EF9 s\u01B0 hi\u1EC7n tr\u01B0\u1EDDng (\u0110\u1ED9i Tr\u01B0\u1EDFng)",
      notes: "Xu\u1EA5t c\u1EA5p cho m\xE1y \u0111\xE0o MPD l\xE0m vi\u1EC7c 2 ca",
      createdAt: (/* @__PURE__ */ new Date("2026-03-24T14:00:00Z")).toISOString()
    },
    {
      id: "tx-3",
      materialId: "mat-4",
      type: "NH\u1EACP",
      date: "2026-03-25",
      quantity: 15,
      unitPrice: 45e3,
      totalPrice: 675e3,
      reference: "PN-02/VPP",
      person: "C\xF4 Lan (H\xE0nh ch\xEDnh)",
      notes: "Mua n\xF3n b\u1EA3o h\u1ED9 lao \u0111\u1ED9ng cho c\xF4ng nh\xE2n m\u1EDBi v\xE0o",
      createdAt: (/* @__PURE__ */ new Date("2026-03-25T11:00:00Z")).toISOString()
    },
    {
      id: "tx-4",
      materialId: "mat-1",
      type: "NH\u1EACP",
      date: "2026-04-04",
      quantity: 200,
      unitPrice: 35440,
      totalPrice: 7088e3,
      reference: "PN-03/DAU",
      person: "\u0110\xE0o V\u0103n Ph\xFA (Th\u1EE7 kho)",
      notes: "Nh\u1EADp d\u1EA7u c\u1EA5p m\xE1y \u0111\xE0o nh\u1EADp tr\u1EF1c ti\u1EBFp",
      createdAt: (/* @__PURE__ */ new Date("2026-04-04T09:00:00Z")).toISOString()
    },
    {
      id: "tx-5",
      materialId: "mat-1",
      type: "XU\u1EA4T",
      date: "2026-04-05",
      quantity: 120,
      unitPrice: 35440,
      totalPrice: 4252800,
      reference: "PX-02/DAU",
      person: "T\xE0i x\u1EBF m\xE1y \u0111\xE0o 09",
      notes: "\u0110\u1ED5 d\u1EA7u tr\u1EF1c ti\u1EBFp m\xE1y \u0111\xE0o 09 v\xE0 m\xE1y 07",
      createdAt: (/* @__PURE__ */ new Date("2026-04-05T15:30:00Z")).toISOString()
    }
  ]
};
var DBWriteMutex = class {
  constructor() {
    this.queue = Promise.resolve();
  }
  async run(fn) {
    const parent = this.queue;
    let resolveNext = () => {
    };
    this.queue = new Promise((resolve) => {
      resolveNext = resolve;
    });
    try {
      await parent;
      return await fn();
    } finally {
      resolveNext();
    }
  }
};
var dbWriteMutex = new DBWriteMutex();
var activeClients = [];
function broadcastPresence() {
  const uniqRoles = Array.from(new Set(activeClients.map((c) => c.role)));
  const payload = {
    type: "presence",
    roles: uniqRoles,
    count: activeClients.length
  };
  const rawMsg = `data: ${JSON.stringify(payload)}

`;
  activeClients.forEach((c) => {
    try {
      c.res.write(rawMsg);
    } catch (err) {
    }
  });
}
function broadcastUpdate(changeType, updatedBy) {
  const payload = {
    type: "update",
    changeType,
    detail: updatedBy,
    timestamp: Date.now()
  };
  const rawMsg = `data: ${JSON.stringify(payload)}

`;
  activeClients.forEach((c) => {
    try {
      c.res.write(rawMsg);
    } catch (err) {
    }
  });
}
async function getDB() {
  try {
    const data = await import_promises.default.readFile(tempDbPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    await import_promises.default.writeFile(tempDbPath, JSON.stringify(defaultDatabase, null, 2), "utf-8");
    return defaultDatabase;
  }
}
async function saveDB(dbData) {
  await import_promises.default.writeFile(tempDbPath, JSON.stringify(dbData, null, 2), "utf-8");
}
app.get("/api/sync-events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const role = req.query.role || "Kh\xE1ch";
  const clientId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
  res.write(`data: ${JSON.stringify({ type: "welcome", clientId })}

`);
  const clientObj = { id: clientId, res, role };
  activeClients.push(clientObj);
  broadcastPresence();
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (err) {
    }
  }, 15e3);
  req.on("close", () => {
    clearInterval(heartbeat);
    activeClients = activeClients.filter((c) => c.id !== clientId);
    broadcastPresence();
  });
});
app.get("/api/data", async (req, res) => {
  try {
    const db = await getDB();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/reset", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    await dbWriteMutex.run(async () => {
      await saveDB(defaultDatabase);
    });
    broadcastUpdate("reset", updater);
    res.json({ message: "Kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u m\u1EABu th\xE0nh c\xF4ng!", database: defaultDatabase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/expenses", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = "exp-" + Date.now();
        item.createdAt = (/* @__PURE__ */ new Date()).toISOString();
        db.expenses.unshift(item);
      } else {
        const idx = db.expenses.findIndex((x) => x.id === item.id);
        if (idx !== -1) {
          db.expenses[idx] = { ...db.expenses[idx], ...item };
        } else {
          db.expenses.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate("expense", updater);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.expenses = db.expenses.filter((x) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate("expense_deleted", updater);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/funds", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = "f-" + Date.now();
        item.createdAt = (/* @__PURE__ */ new Date()).toISOString();
        db.funds.unshift(item);
      } else {
        const idx = db.funds.findIndex((x) => x.id === item.id);
        if (idx !== -1) {
          db.funds[idx] = { ...db.funds[idx], ...item };
        } else {
          db.funds.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate("fund", updater);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/funds/:id", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.funds = db.funds.filter((x) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate("fund_deleted", updater);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/documents", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = "doc-" + Date.now();
        db.documents.unshift(item);
      } else {
        const idx = db.documents.findIndex((x) => x.id === item.id);
        if (idx !== -1) {
          db.documents[idx] = { ...db.documents[idx], ...item };
        } else {
          db.documents.unshift(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate("document", updater);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.documents = db.documents.filter((x) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate("document_deleted", updater);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/materials", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const item = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!item.id) {
        item.id = "mat-" + Date.now();
        db.materials.push(item);
      } else {
        const idx = db.materials.findIndex((x) => x.id === item.id);
        if (idx !== -1) {
          db.materials[idx] = { ...db.materials[idx], ...item };
        } else {
          db.materials.push(item);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate("material", updater);
    res.json({ success: true, item });
  } catch (err) {
    res.status(550).json({ error: err.message });
  }
});
app.post("/api/inventory/transaction", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const transaction = req.body;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      if (!transaction.id) {
        transaction.id = "tx-" + Date.now();
        transaction.createdAt = (/* @__PURE__ */ new Date()).toISOString();
        db.inventoryTransactions.unshift(transaction);
      } else {
        const idx = db.inventoryTransactions.findIndex((x) => x.id === transaction.id);
        if (idx !== -1) {
          db.inventoryTransactions[idx] = { ...db.inventoryTransactions[idx], ...transaction };
        } else {
          db.inventoryTransactions.unshift(transaction);
        }
      }
      await saveDB(db);
    });
    broadcastUpdate("inventory", updater);
    res.json({ success: true, item: transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/inventory/transaction/:id", async (req, res) => {
  try {
    const updater = req.header("x-updater") || "m\xE1y t\xEDnh kh\xE1c";
    const { id } = req.params;
    await dbWriteMutex.run(async () => {
      const db = await getDB();
      db.inventoryTransactions = db.inventoryTransactions.filter((x) => x.id !== id);
      await saveDB(db);
    });
    broadcastUpdate("inventory_deleted", updater);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SERVER] Kh\u1EDFi ch\u1EA1y th\xE0nh c\xF4ng tr\xEAn c\u1ED5ng http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
