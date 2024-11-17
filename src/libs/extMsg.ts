
import * as vscode from 'vscode';

// Alternative to LogOutputChannel since log level can't be set programmatically

/************************************************************
 * Start of modification area
*/
 
/**
 *  
 * This array is called 'Order' because the first one will be the default.
 */

const outputChannelNameOrder = ["File Switcher"] as const;

/**
 * 
 * For developer console messages set this in launch.json:
  
  "env": {
		"DebuggingExtension": "true"
	}

 *
 */

/******************************************************************
 * End of modification area
 */


export type OutputChannelName = typeof outputChannelNameOrder[number];

// The order of Verbosity from Minimal to Verbose.
const verbosityOrder = {
    "none": 0,
    "error": 1,
    "warning": 2,
    "info": 3,
    "debug": 4
} as const;

export type Verbosity = keyof typeof verbosityOrder;

export function isVerbosity(verbosity: string | undefined): verbosity is Verbosity {
    return verbosity ? Object.prototype.hasOwnProperty.call(verbosityOrder, verbosity) : false;  // TODO does this work?
}

type ShowOutputOn = "None" | "onError" | "onWarningError";

/**
* What's prepended to the message
*/
export type PrependOptions = {
    dateTime: boolean,
    verbosity: boolean
};

const DEV_PREFIX = "[dev]:";

/**
 * @param logLanguageId default: "log"
 * @param prepend PrependOptions Global prepend options. default: { dateTime: true, verbosity: true }
 */
class ExtensionMessage {
    readonly outputChannel: vscode.OutputChannel;
    private _verbosity!: Verbosity; // assigned with setter
    private prependOptions: PrependOptions;
    private showOn: ShowOutputOn = "None";
       
    public constructor(
        outputChannelName: string,
        currentVerbosity: Verbosity,
        logLanguageId = "log",
        prepend: PrependOptions = { dateTime: true, verbosity: true }) {
        
        this._verbosity = currentVerbosity;

        this.outputChannel = vscode.window.createOutputChannel(outputChannelName, logLanguageId);
        this.prependOptions = prepend;

        console.debug(DEV_PREFIX, `Current Verbosity is set to: ${this._verbosity}`, this._verbosity );
    }

    public dispose(){
        this.outputChannel.dispose();
    }
        
    public get verbosity() {
        return this._verbosity;
    }

    public set verbosity(verbosity: Verbosity)  {
        console.debug(DEV_PREFIX, "Verbosity set to: ", verbosity, `(${this.outputChannel.name})`);
        this._verbosity = verbosity;  
    }
    
    public message(verbosity: Verbosity, msg: string, ...infos: unknown[]){
        
        const modifiedMsg = this.getModifiedMsg(msg, verbosity);
        this.outputChannel.appendLine(modifiedMsg);
        for (const info of infos) {
            this.outputChannel.appendLine(`\t"${String(info)}"`);
        }
    }

    public getShowOn(){
        return this.showOn;
    }

    public setShowOn(switchTo: ShowOutputOn){
        this.showOn = switchTo;
    }

    public show() {
        this.outputChannel.show(true);
    }
    
    private getModifiedMsg(msg: string, verbosity: Verbosity){
        
        const dateClass = new Date();
        dateClass.setMinutes(dateClass.getMinutes() - dateClass.getTimezoneOffset());
            
        const dateTime = this.prependOptions.dateTime ? `${dateClass.toISOString().replace(/[Z|T]/gm," ")}` : "";
        const _verbosity = this.prependOptions.verbosity ? `[${verbosity}] ` : "";

        return `${dateTime}${_verbosity}${msg}`;
    }

}


let _msg: ExtensionMessage | undefined = undefined;

/**
 * Creates module level output channel that can be used anywhere
 * 
 * @param currentVerbosity 
 * @param logLanguageId default: "log"
 * @param globalPrepend default: {datetime: true, verbosity: true}
 * @param outputChannelName default: outputChannelOrder[0]
 * @returns 
 */
export function createExtensionMessage( 
    currentVerbosity: Verbosity,
    outputChannelName: OutputChannelName = outputChannelNameOrder[0],
    logLanguageId = "log",
    globalPrepend?: PrependOptions    
    ) {
    
    if(_msg){
        console.debug(DEV_PREFIX, "Extension message already has an output channel.");
        return;
    }
    
    console.debug(DEV_PREFIX, "Creating extension message,",outputChannelName, currentVerbosity, logLanguageId);
    _msg = new ExtensionMessage(outputChannelName, currentVerbosity, logLanguageId, globalPrepend);
    
    debug("Created Extension Message:", outputChannelName);  
    
}


/**
 * Sends message to output panel and/or dev console
 * 
 * @param message 
 * @param localPrepend Will override global prepend options. You can prepend info to the message such as date/time.
 * @param outputChannelName default is first output channel(outputChannelNameOrder[0]) but can be specified if you use more than one output channel
 */
export function info(message: string, ...infos: unknown[]): void {
    
    if(!_msg || verbosityOrder[_msg.verbosity]< verbosityOrder["info"]){
        return;
    }

    if(_msg.getShowOn() === "onError" || _msg.getShowOn() === "onWarningError"){
        _msg.show();
    }
    _msg.message("info", message, ...infos);

    if(process?.env["DebuggingExtension"]) {
        console.info(message);
    }
}


/**
 * Sends message to output panel and/or dev console
 * 
 * @param message 
 * @param localPrepend Will override global prepend options. You can prepend info to the message such as date/time.
 * @param outputChannelName default is first output channel(outputChannelNameOrder[0]) but can be specified if you use more than one output channel
 */
export function warning(message: string, ...infos: unknown[]): void {
    
    if(!_msg || verbosityOrder[_msg.verbosity] < verbosityOrder["warning"]){
        return;
    }

    if(_msg.getShowOn() === "onWarningError"){
        _msg.show();
    }
    _msg.message("warning",message, ...infos);

    if(process?.env["DebuggingExtension"]) {
        console.warn(message);
    }
}


/**
 * Sends message to output panel and/or dev console
 * 
 * @param message 
 * @param localPrepend Will override global prepend options. You can prepend info to the message such as date/time.
 * @param outputChannelName default is first output channel(outputChannelNameOrder[0]) but can be specified if you use more than one output channel
 */
export function error(message: string, ...infos: unknown[]): void {
    
    if(!_msg || verbosityOrder[_msg.verbosity] < verbosityOrder["error"]){
        return;
    }
    _msg.message("error", message, ...infos);

    if(process?.env["DebuggingExtension"]) {
        console.error(message);
    }
}


/**
 * Sends message to output panel and/or dev console
 * 
 * @param message 
 * @param infos Converted to string with String()
 */
export function debug(message: string, ...infos: unknown[]) {
    
    if(!_msg || verbosityOrder[_msg.verbosity] < verbosityOrder["debug"]){
        return;
    }
    
    _msg.message("debug", message, ...infos);

    if(process?.env["DebuggingExtension"]) {
        console.info(message);
    }
}


/**
 * 
 * @param verbosity 
 * @param outputChannelName default: outputChannelNameOrder[0]
 * @returns 
 */
export function setVerbosity(verbosity: Verbosity) {
    console.debug(DEV_PREFIX, "Attempting to set verbosity...");
    
    if(!_msg){ 
        console.debug(DEV_PREFIX, "Couldn't set verbosity!");
        return;
    }

    _msg.verbosity = verbosity;

}


/**
 * 
 * @param outputChannelName undefined(default): dispose all output channels
 * 
 */
export function dispose(): void {
    if(!_msg) {return;}

    _msg?.dispose();
    _msg = undefined;
}

export function getOutputChannel(): vscode.OutputChannel | undefined {
    return _msg?.outputChannel;
}

export function hasExtensionMessage() {
    return _msg !== undefined;
}

export function setShowOutputOn(switchOn: ShowOutputOn) {
    _msg?.setShowOn(switchOn);
}
