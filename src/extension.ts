import * as vscode from "vscode";
import { PEOPLE } from "./people";
import { Meeting, calcElapsedSeconds, meter, MeetingRecord, meetingRecord, formatter, meetingCostPerSecond } from "./cost"


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

  async function reset(){

    if (meeting && startTime){
      // save session if there is one
      let history = context.globalState.get<MeetingRecord[]>("history");
      if (history === undefined) {history = []}; // if none just create empty

      const thisMeeting = meetingRecord(meeting, startTime, new Date());
      history.push(thisMeeting)

      await context.globalState.update("history", history);
      console.log(context.globalState.get("history"))
    }

    clearInterval(startMeter);
    statusBar.hide();

    startTime = undefined;
    startMeter = undefined;
    meeting = undefined;

    statusBar.backgroundColor = undefined;
  }

  const start = vscode.commands.registerCommand("meetingTaximeter.start", async () => {
    console.log("start command ran!");
    vscode.window.showInformationMessage("Fuck. meetings. again.");

    const names = Object.keys(PEOPLE);

    const picked = await vscode.window.showQuickPick(names, {
      canPickMany: true,
      placeHolder: "Who's in this meeting?"
    });

    if (picked === undefined || picked.length === 0) return;

    const duration = await vscode.window.showInputBox({
      prompt: "How long is this meeting (in minutes)?",
      value: "30",
      validateInput: (v) => { // return undefined = validate passed
        if (v.trim() === "") return "Bruh enter something";
        if (Number.isNaN(Number(v)) || Number(v) <= 0) return "Bruh sensible numbers only";
      }
    })

    if (duration === undefined) return;

    await reset(); //start fresh
    
    const roles = picked.map(name => PEOPLE[name]);

    meeting = {
      roles, durationMinutes: Number(duration)
    };

    console.log(`This meeting is expected to cost ${formatter.format(meetingCostPerSecond(meeting) * meeting.durationMinutes * 60)}...`)

    startTime = new Date();
    statusBar.show();

    tick(); //tick first to start meter empty
    startMeter = setInterval(tick, 250); // 4 tickets per seconds
  });
  context.subscriptions.push(start);

  const stop = vscode.commands.registerCommand("meetingTaximeter.stop", async () => {
    console.log("stop command ran!")

    await reset();
  });
  context.subscriptions.push(stop);

  const clear = vscode.commands.registerCommand("meetingTaximeter.clear", async() => {
    console.log("clear command ran!")
    await context.globalState.update("history", undefined);
  });
  context.subscriptions.push(clear);
}