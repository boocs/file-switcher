
import * as vscode from 'vscode';

import path = require("path");


import * as msg from './libs/extMsg';

import * as cfg from './cfg';
import { MapQueue } from './libs/containers';
import { EXTENSION_OUTPUT_FILENAME_START } from './consts';


let _currentUriToSwitchTo: vscode.Uri | undefined = undefined;
let _isStoringSwitchFile = false;  // Don't switch to file if currently calculating file to switch to

const pathCache = new MapQueue(200);


export async function activate(context: vscode.ExtensionContext) {
	
	const mainWorkspaceFolder = getMainWorkspaceFolder();
	if(!mainWorkspaceFolder){
		return;
	}
	
	onActivateBegin();
	msg.info("File Switcher extension is now active.");
				
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
		
		if(!e || e.document.fileName.startsWith(EXTENSION_OUTPUT_FILENAME_START)){
			return;
		}
		setIsStoringSwitchFile(true);

		msg.debug("onDidChangeActiveTextEditor with defined parameter.");
		await storeSwitchPath(e.document.fileName);

	}));

	context.subscriptions.push(vscode.commands.registerCommand('file-switcher.switchFile', async () => {
		const currentSwitchUri = getCurrentSwitchUri();
		
		if(isStoringSwitchFile() || !currentSwitchUri){
			if(isStoringSwitchFile()){
				msg.warning("Currently storing switch file. Cannot switch files yet.");
				return;
			}
			msg.info("No friend URI was found to switch to for current file. Cannot switch files.");
			return;
		}
		msg.debug("Attempting to switch to file:", currentSwitchUri.fsPath);
		
		const doc = await vscode.workspace.openTextDocument(currentSwitchUri);
		await vscode.window.showTextDocument(doc);

	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {

		if(!e.affectsConfiguration("file-switcher")){ return;}

		onDidChangeExtensionConfig(e);
	}));

	await onActivateEnd();
}


// This method is called when your extension is deactivated
export function deactivate() {
	msg.dispose();
}


function reset(){
	msg.debug("Resetting extension variables.");
	setCurrentSwitchUri(undefined);
	setIsStoringSwitchFile(false);
}

async function onActivateEnd() {
	const currentActiveTextEditor = vscode.window.activeTextEditor;
	if(!currentActiveTextEditor){
		return;
	}
	msg.debug("Running storeSwitchPath on startup");
	await storeSwitchPath(currentActiveTextEditor.document.fileName);
}

function onActivateBegin() {
	const mainWorkspaceFolder = getMainWorkspaceFolder();
	const extConfig = vscode.workspace.getConfiguration(cfg.EXTENSION_ID, mainWorkspaceFolder);
	cfg.runAllActionSettingFuncs(extConfig);
}


async function storeSwitchPath(currentFilePath: string | undefined) {
	msg.info("Calling storeSwitchPath()", currentFilePath);
		
	if(!currentFilePath){
		msg.debug("Returning reason: param was undefined");
		reset();
		return;
	}
	

	// Check cache
	if(isCacheDisabled() === false){

		const cachedPath = pathCache.get(currentFilePath);
		if (cachedPath !== undefined){
			msg.info("Current path found in path cache");
			const switchUri = vscode.Uri.file(cachedPath);
			setCurrentSwitchUri(switchUri);
	
			setIsStoringSwitchFile(false);
			msg.debug("Returning reason: Path found in cache");
			return;
		}
	}

	const parsedCurrentFile: path.ParsedPath = path.parse(currentFilePath);
	
	const friendFileName = getFriendFileName(parsedCurrentFile.name, parsedCurrentFile.ext);
	if(!friendFileName){
		reset();
		msg.debug("Returning reason: Couldn't create switch file name");
		return;
	}

	const switchUri: vscode.Uri | undefined = await getFriendFile(
		vscode.workspace.getWorkspaceFolder(vscode.Uri.file(currentFilePath)),
		friendFileName,
		parsedCurrentFile.dir
	);

	if(!switchUri){
		reset();
		msg.debug("Returning reason: No switch file found");
		return;
	}
	
	setCurrentSwitchUri(switchUri);
	pathCache.set(currentFilePath, switchUri.fsPath); // We already check above if currentFilePath is in pathCache
	msg.info(`Cache entries: ${pathCache.size.toString()}/${pathCache.maxSize.toString()}, Est. Size in Memory(KiB): ${(pathCache.getEstMemorySize() / 1024).toString()}`);
	msg.info("Switch uri set to: ", getCurrentSwitchUri()?.fsPath);
	setIsStoringSwitchFile(false);


	msg.debug("Returning reason: end of function");
	return;
	
}


function getFriendFileName(currentName: string, currentExtension: string) {
	
	if(!currentExtension){
		return;
	}
	
	const friendExts = getFriendExtension(currentExtension, cfg.getQuickSettings().extensions);

	if(!friendExts){
		return;
	}
		
	return `${currentName}.{${friendExts}}`;
}

async function getFriendFile(currentFileWorkspace: vscode.WorkspaceFolder | undefined, friendFileName: string, firstSearchDir: string) {
	
	if(!currentFileWorkspace){
		msg.warning("Cuurent file isn't part of any workspace");
		return;
	}
	
	const numberOfCurrentWorkspaceFolderSegments = getFolderSegmentsFromPath(currentFileWorkspace.uri.fsPath).length;
	const searchFolders = getSearchFolders(numberOfCurrentWorkspaceFolderSegments, getFolderSegmentsFromPath(firstSearchDir));
	msg.info("Search Folders are:", searchFolders);
	if(!searchFolders || searchFolders.length === 0){
		msg.debug("Folders couldn't be searched!");
		return;
	}

	return await findFriendFile(friendFileName, currentFileWorkspace, searchFolders);
}


function getFriendExtension(extension: string, fileSwitchExtensions: string[]): string | undefined {
	msg.debug("getFriendExtension()", extension);

	const ext = extension.replace(/^\./, ""); // remove dot from extension
    const [extensions0, extensions1] = fileSwitchExtensions.map(exts => exts.split(","));

    if (extensions0.includes(ext)) {
        return extensions1.join(",");
    } else if (extensions1.includes(ext)) {
        return extensions0.join(",");
    }

    msg.debug("Didn't find friend extension.");
    return;

}


async function findFriendFile(fileName: string, currentWorkspace: vscode.WorkspaceFolder, searchFolders: string[]) {
	msg.debug("findFriendFile()");
	const mutSearchFolders = [...searchFolders];  // shallow copy
	let excludeRelPath: vscode.RelativePattern | undefined = undefined;
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for (const _doesNothing of searchFolders) {
					
		const foldersGlob = mutSearchFolders.join("/");

		const glob = `${foldersGlob}/**/${fileName}`;
		const relPat = new vscode.RelativePattern(currentWorkspace, glob);
		
		msg.debug("Searching here:", relPat.baseUri.fsPath, relPat.pattern);
		const foundFile = await vscode.workspace.findFiles(relPat, excludeRelPath, 1);

		if(!foundFile || foundFile.length < 1){
			excludeRelPath = new vscode.RelativePattern(currentWorkspace, `${foldersGlob}`);
			mutSearchFolders.pop();
			continue;
		}
		else {
			msg.info("Found friend file:", foundFile[0].fsPath);
			return foundFile[0];
		}
	}
}


function getSearchFolders(numWorkspacePathSegments: number, pathSegments: string[]): string[] {
	msg.debug("getSearchFolders()");
		
	if(pathSegments.length < numWorkspacePathSegments){
		return [];
	}

	return pathSegments.slice(numWorkspacePathSegments);
}


function getFolderSegmentsFromPath(path: string) { //, re = `(?<=[/\\\\]|^)(?:[\\w\\s-_.])+(?=[/\\\\]|$)`, reflags = 'g'): string[] {
	msg.debug("getFolderSegmentsFromPath()", path);

	return path.split(/[/\\]/);

}


function onDidChangeExtensionConfig(e: vscode.ConfigurationChangeEvent) {
	msg.debug("onDidChangeExtensionConfig()");
	const mainWorkspaceFolder = getMainWorkspaceFolder();
	const config = vscode.workspace.getConfiguration(cfg.EXTENSION_ID, mainWorkspaceFolder);

	for (const setting of cfg.getActionSettingsIterator()) {
		if(!e.affectsConfiguration(`${cfg.EXTENSION_ID}.${setting}`)){ 
			continue;
		}
		
		msg.debug("Changing setting: ", setting);
		cfg.actionSettingFuncs.get(setting)?.(config, setting);
		break;
	}
}

function getCurrentSwitchUri(): vscode.Uri | undefined {
	return _currentUriToSwitchTo;
}

function setCurrentSwitchUri(uri: vscode.Uri | undefined) {
	msg.debug("Current switch uri set to:", uri?.fsPath);
	_currentUriToSwitchTo = uri;
}

function isStoringSwitchFile(): boolean {
	return _isStoringSwitchFile;
}

function setIsStoringSwitchFile(value: boolean) {
	_isStoringSwitchFile = value;
}

function getMainWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
	const mainWorkspaceFolder = vscode.workspace.workspaceFile ? vscode.workspace.getWorkspaceFolder(vscode.workspace.workspaceFile) : vscode.workspace.workspaceFolders?.[0];

	if(mainWorkspaceFolder === undefined){
		msg.debug("Main workspace folder was undefined!");
	}
	
	return mainWorkspaceFolder;
}

export function setCacheMaxSize(size: number) {
	pathCache.maxSize = size;
}

function isCacheDisabled() {
	return pathCache.maxSize === 0;
}
