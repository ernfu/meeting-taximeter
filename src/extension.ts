import * as vscode from "vscode";

type Role = "ceo" | "coo" | "hds" | "cco" | "hmkt" | "cstat" | "htp" | "heng" | "csci" | "cdev" | "ds" | "de" | "sde" | "ca";

type RoleRow = {
  role: Role;
  count: number;
  annualSalary: number;
};

type Meeting ={
  roles: RoleRow[];
  durationMinutes: number;
};

// 52 weeks, 5 days a week, 13 public holiday in VIC, 20 days PTO.
// 8.5 working hours per day
const WORKING_SECONDS_PER_YEAR = (52 * 5 - 13 - 20) * 8.5 * 60 * 60;

export function rowCostPerSecond(roleRow: RoleRow): number{
  return roleRow.count * roleRow.annualSalary / WORKING_SECONDS_PER_YEAR;
}

export function meetingCostPerSecond(meeting: Meeting): number{

  let total = 0;

  for (const row of meeting.roles){
    total += rowCostPerSecond(row);
  }

  return total;
}

export function calcElapsedSeconds(start: Date, now: Date): number{
  // getTime in ms, /1000 to get seconds
  return (now.getTime() - start.getTime()) / 1000
}

export function meter(meeting: Meeting, start: Date, now: Date): string{

  const elapsedSeconds = calcElapsedSeconds(start, now)
  const costPerSecond = meetingCostPerSecond(meeting)

  const formatter = new Intl.NumberFormat("en-AU", {style: "currency", currency: "AUD"})

  return `meeting now costs ${formatter.format(costPerSecond * elapsedSeconds)}`;
}

let startTime: Date | undefined;
let meeting: Meeting | undefined;
let startMeter: NodeJS.Timeout | undefined;


export function activate(context: vscode.ExtensionContext){

  const statusBar = vscode.window.createStatusBarItem()

  const start = vscode.commands.registerCommand("meetingTaximeter.start", () => {
    console.log("start command ran!");
    vscode.window.showInformationMessage("Fuck. meetings. again.");

    const testMeeting: Meeting = {
      roles: [
        {role: "ceo", count: 1, annualSalary: 400000}
      ],
      durationMinutes: 60
    };

    const testMeetCost = meetingCostPerSecond(testMeeting) * 60 * testMeeting.durationMinutes;
    console.log(`1h of ceo's time is worth ${testMeetCost}`);

    startTime = new Date();
    meeting = testMeeting;
    startMeter = setInterval(
      () => {
        if (!meeting || !startTime) return;
        statusBar.text = (meter(meeting, startTime, new Date()));
        statusBar.show();
      },
      1000
    );
  });
  context.subscriptions.push(start);

  const stop = vscode.commands.registerCommand("meetingTaximeter.stop", () => {
      console.log("stop command ran!")
      
      clearInterval(startMeter)
      statusBar.hide()

      startTime = undefined;
      startMeter = undefined;
      meeting = undefined;
  });
  context.subscriptions.push(stop);
}

export function deactivate() {}