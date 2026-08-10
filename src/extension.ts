import * as vscode from "vscode";

type Role = "ceo" | "coo" | "cco" | "cfo" | "cstat" | "csci" | "cdev" | "hds" | "heng" | "htp" | "hmkt" | "vpsales" | "revops" | "mktex" | "ea" | "smsp" | "ds" | "jds" | "da" | "ca" | "sse" | "ssysops" | "sdev" | "jfd";

type Meeting ={
  roles: Role[];
  durationMinutes: number;
};

// random guess from https://lnkd.in/p/gusW6sFU
const ROLE_SALARY: Record<Role, number> = {
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


const PEOPLE: Record<string, Role> = {
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

// 52 weeks, 5 days a week, 13 public holiday in VIC, 20 days PTO.
// 8.5 working hours per day
const WORKING_SECONDS_PER_YEAR = (52 * 5 - 13 - 20) * 8.5 * 60 * 60;

export function roleCostPerSecond(role: Role): number{
  return ROLE_SALARY[role] / WORKING_SECONDS_PER_YEAR;
}

export function meetingCostPerSecond(meeting: Meeting): number{

  let total = 0;

  for (const role of meeting.roles){
    total += roleCostPerSecond(role);
  }

  return total;
}

export function calcElapsedSeconds(start: Date, now: Date): number{
  // getTime in ms, /1000 to get seconds
  return (now.getTime() - start.getTime()) / 1000
}

const formatter = new Intl.NumberFormat("en-AU", {style: "currency", currency: "AUD"})

export function meter(meeting: Meeting, start: Date, now: Date): string{

  const elapsedSeconds = calcElapsedSeconds(start, now)
  const costPerSecond = meetingCostPerSecond(meeting)

  return `meeting now costs ${formatter.format(costPerSecond * elapsedSeconds)}`;
}

let startTime: Date | undefined;
let meeting: Meeting | undefined;
let startMeter: NodeJS.Timeout | undefined;


export function activate(context: vscode.ExtensionContext){

  const statusBar = vscode.window.createStatusBarItem();
  context.subscriptions.push(statusBar);

  function tick(){
    if (!meeting || !startTime) return;

    const currTime = new Date();

    statusBar.text = (meter(meeting, startTime, currTime));

    // overtime logic
    if (calcElapsedSeconds(startTime, currTime) > meeting.durationMinutes * 60){
      statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
  }

  function reset(){
    clearInterval(startMeter);
    statusBar.hide();

    startTime = undefined;
    startMeter = undefined;
    meeting = undefined;

    statusBar.backgroundColor = undefined;
  }

  const start = vscode.commands.registerCommand("meetingTaximeter.start", () => {
    console.log("start command ran!");
    vscode.window.showInformationMessage("Fuck. meetings. again.");

    reset(); //start fresh

    const testMeeting: Meeting = {
      roles: ["ceo"],
      durationMinutes: 0.01
    };

    const testMeetCost = meetingCostPerSecond(testMeeting) * 60 * testMeeting.durationMinutes;
    console.log(`1h of ceo's time is worth ${testMeetCost}`);

    startTime = new Date();
    meeting = testMeeting;
    statusBar.show();

    tick(); //tick first to start meter empty
    startMeter = setInterval(tick, 1000);
  });
  context.subscriptions.push(start);

  const stop = vscode.commands.registerCommand("meetingTaximeter.stop", () => {
      console.log("stop command ran!")

      reset();
  });
  context.subscriptions.push(stop);
}

export function deactivate() {}