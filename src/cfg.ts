import * as vscode from "vscode";
import * as msg from './libs/extMsg';

import { setCacheMaxSize } from "./extension";


export const EXTENSION_ID = "file-switcher";

export const allSettings = ["log.logLevel", "extensions", "cache.pathCount"] as const;
export type Setting = typeof allSettings[number];

/**
 * Settings that have actions when changed
 */
type ActionSetting = Exclude<Setting, "">;   // Can use Exclude or Extract

/**
 * Settings with quick access. The local setting will match the value of extension's setting.
 */
type QuickSetting = Extract<ActionSetting, "extensions">; // Can use Exclude or Extract

export interface FriendExtensions {
    readonly "extensions1": string,
    readonly "extensions2": string
}

function isFriendExtensions(extensions: object | undefined): extensions is FriendExtensions {
    return ['extensions1', 'extensions2'].every((key) => Object.prototype.hasOwnProperty.call(extensions, key));
}


type IQuickSettings = {
    [key in QuickSetting]: key extends "extensions" ? string[] : never;
};

// This is exported as readonly, via a function, below this variable 
const quickSettings: IQuickSettings = {
    extensions: []
};

// Exported readonly quickSettings
export function getQuickSettings(): Readonly<IQuickSettings> {
    return quickSettings;
}


export const actionSettingFuncs = new Map<ActionSetting, ((workspaceConfig:vscode.WorkspaceConfiguration, setting: ActionSetting) => void)>(  

    [["log.logLevel", (workspaceConfig: vscode.WorkspaceConfiguration, setting: ActionSetting) => {
        
        const currentVerbosity =  workspaceConfig.get<string>(setting)?.toLowerCase();
        
         if(!msg.isVerbosity(currentVerbosity)) {
            console.debug("Error getting Verbosity from cfg:", currentVerbosity);
            msg.setVerbosity("none");
            return;
        }
        
        if(currentVerbosity === "none"){
            msg.dispose();
            return;
        }
    
        if(msg.hasExtensionMessage()){
            msg.setVerbosity(currentVerbosity);
            msg.info("Log level set to:", currentVerbosity);
        }
        else {
            msg.createExtensionMessage(currentVerbosity);
            msg.info("Log level set to:", currentVerbosity);
        }
 
        return;
    }],
    ["extensions", (workspaceConfig: vscode.WorkspaceConfiguration, setting: ActionSetting) => {
        
        const friendExtensions = workspaceConfig.get<FriendExtensions>(setting);

        if(!friendExtensions || isFriendExtensions(friendExtensions) === false){
            msg.error("Error accessing friend extensions setting.");
            return;
        }

        quickSettings.extensions = [friendExtensions.extensions1, friendExtensions.extensions2];
    }],
    ["cache.pathCount", (workspaceConfig: vscode.WorkspaceConfiguration, setting: ActionSetting) => {
        const cacheSize = workspaceConfig.get<number>(setting);

        if(cacheSize === undefined || Number.isInteger(cacheSize) === false) {
            msg.error("Cache size was:", cacheSize);
            return;
        }

        setCacheMaxSize(cacheSize);
    }]

] );

export function getActionSettingsIterator() {
    return actionSettingFuncs.keys();
}

export function runAllActionSettingFuncs(workspaceConfig: vscode.WorkspaceConfiguration) {
    msg.debug("runAllActionSettingFuncs");
    for (const [key, actionFunc] of actionSettingFuncs) {
        actionFunc(workspaceConfig, key);
    }
}
