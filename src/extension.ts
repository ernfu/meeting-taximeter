import * as vscode from "vscode";
import { PEOPLE } from "./people";
import { Meeting, MeetingRecord, meetingRecord, formatter, meetingCostPerSecond, getMeetingRecords, totalCost, topByCost, monthRange, quarterRange } from "./cost"
import { TaximeterViewProvider, ViewState } from "./view";


let startTime: Date | undefined;
let meeting: Meeting | undefined;


export function activate(context: vscode.ExtensionContext){

  const view = new TaximeterViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TaximeterViewProvider.viewId, view, {
      webviewOptions: { retainContextWhenHidden: true } // keeps the animation alive when you switch panel tabs
    })
  );

  function viewState(): ViewState {
    const history = context.globalState.get<MeetingRecord[]>("history") ?? [];
    const now = new Date();

    return {
      meeting: meeting && startTime ? {
        startedAt: startTime.getTime(),
        durationSeconds: meeting.durationMinutes * 60,
        costPerSecond: meetingCostPerSecond(meeting),
        people: meeting.people
      } : undefined,
      stats: {
        month: totalCost(getMeetingRecords(history, ...monthRange(now))),
        quarter: totalCost(getMeetingRecords(history, ...quarterRange(now))),
        leaderboard: topByCost(history, 3).map(toEntry),
        recent: [...history].reverse().slice(0, 50).map(toEntry) // newest first
      }
    };
  }

  function toEntry(m: MeetingRecord){
    return { start: m.start, cost: m.cost, elapsedSeconds: m.elapsedSeconds, who: m.people ?? m.roles };
  }

  function refreshView(){
    view.update(viewState());
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

    startTime = undefined;
    meeting = undefined;

    refreshView();
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
      people: picked, roles, durationMinutes: Number(duration)
    };

    console.log(`This meeting is expected to cost ${formatter.format(meetingCostPerSecond(meeting) * meeting.durationMinutes * 60)}...`)

    startTime = new Date();

    refreshView();
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
    refreshView();
  });
  context.subscriptions.push(clear);

  const history = vscode.commands.registerCommand("meetingTaximeter.history", async() => {
    console.log("history command ran!")
    await vscode.commands.executeCommand(TaximeterViewProvider.focusCommand);
  });
  context.subscriptions.push(history)

  refreshView(); // stats are there before the first meeting
}