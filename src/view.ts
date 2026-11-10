import * as vscode from "vscode";
import { randomBytes } from "crypto";

// everything the webview needs to draw itself, posted whenever something changes
export type ViewState = {
    meeting?: {
        startedAt: number; // epoch ms; the webview derives elapsed from this, it never counts
        durationSeconds: number;
        costPerSecond: number;
        people: string[];
    };
    stats: {
        month: number;
        quarter: number;
        leaderboard: HistoryEntry[];
        recent: HistoryEntry[];
    };
};

type HistoryEntry = { start: number; cost: number; elapsedSeconds: number; who: string[] };

export class TaximeterViewProvider implements vscode.WebviewViewProvider {

    static readonly viewId = "meetingTaximeter.view";
    static readonly focusCommand = "meetingTaximeter.view.focus"; // VS Code generates <viewId>.focus

    private view?: vscode.WebviewView;
    private state?: ViewState;

    constructor(private readonly extensionUri: vscode.Uri) {}

    async resolveWebviewView(view: vscode.WebviewView){

        const media = vscode.Uri.joinPath(this.extensionUri, "media");

        this.view = view;
        view.webview.options = { enableScripts: true, localResourceRoots: [media] };
        view.onDidDispose(() => { this.view = undefined; });

        view.webview.onDidReceiveMessage((msg: { type: string }) => {
            if (msg.type === "ready") this.post();
            if (msg.type === "start") vscode.commands.executeCommand("meetingTaximeter.start");
            if (msg.type === "stop") vscode.commands.executeCommand("meetingTaximeter.stop");
            if (msg.type === "clear") vscode.commands.executeCommand("meetingTaximeter.clear");
        });

        view.webview.html = await this.html(view.webview, media);
    }

    update(state: ViewState){
        this.state = state;
        this.post();
    }

    private post(){
        if (this.view && this.state) this.view.webview.postMessage({ type: "state", ...this.state });
    }

    // media/view.html with the webview-specific bits filled in
    private async html(webview: vscode.Webview, media: vscode.Uri): Promise<string>{

        const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(media, "view.html"));
        const asUri = (file: string) => webview.asWebviewUri(vscode.Uri.joinPath(media, file)).toString();

        return new TextDecoder().decode(bytes)
            .replaceAll("{{cspSource}}", webview.cspSource)
            .replaceAll("{{nonce}}", randomBytes(16).toString("hex"))
            .replaceAll("{{styleUri}}", asUri("view.css"))
            .replaceAll("{{scriptUri}}", asUri("view.js"));
    }
}
