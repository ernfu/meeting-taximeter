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


export function activate(context: vscode.ExtensionContext){

    const start = vscode.commands.registerCommand("meetingTaximeter.start", () => {
        console.log("command ran!");
        vscode.window.showInformationMessage("Fuck. meetings. again.");

        const testMeeting: Meeting = {
          roles: [
            {role: "ceo", count: 1, annualSalary: 400000}
          ],
          durationMinutes: 60
        };

        const testMeetCost = meetingCostPerSecond(testMeeting) * 60 * testMeeting.durationMinutes;
        console.log(`1h of ceo's time is worth ${testMeetCost}`)

      });
      context.subscriptions.push(start);

}

export function deactivate() {}