
//import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";


import {suite, before, describe, it, beforeEach, afterEach} from "mocha";
import * as sinon from "sinon";

import rewire = require('rewire');

import { expect} from "chai";

//import * as ext from "../../extension";
import * as msg from "../../libs/extMsg";

import { MapQueue } from "../../libs/containers";

interface RewiredModule {
	/**
	 * Takes all enumerable keys of obj as variable names and sets the values respectively. Returns a function which can be called to revert the change.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	__set__(obj: { [variable: string]: never }): () => void;
	/**
	 * Sets the internal variable name to the given value. Returns a function which can be called to revert the change.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	__set__(name: string, value: never): () => void;
	/**
	 * Returns the private variable with the given name.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	__get__<T = unknown>(name: string): T;
	/**
	 * Returns a function which - when being called - sets obj, executes the given callback and reverts obj. If callback returns a promise, obj is only reverted after
	 * the promise has been resolved or rejected. For your convenience the returned function passes the received promise through.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	__with__(obj: { [variable: string]: never }): (callback: () => never) => never;
}

type NestedObject = Record<string, unknown>;

class TestClass<T extends RewiredModule & { [key: string]: never }> {
	private module: T;
	private _sandbox = sinon.createSandbox();
	private restoreFunctions: Array<() => void> = [];

	constructor(modulePath: string) {
		this.module = rewire(modulePath);
	}

	private _get<K extends keyof T>(variableName: K): T[K] {
		return this.module.__get__(variableName as string);
	}

	private _set<K extends keyof T>(variableName: K, value: unknown): void {
		this.restoreFunctions.push(this.module.__set__(variableName as string, value as never));
	}

	public getFunction<R>(name: string): (...args: unknown[]) => R {
		return this._get(name);
	}

	public getModuleItem<R>(name: string): R {
		return this._get(name);
	}

	public replace(replaceName: string, replacement: unknown){
		
		const dotNotationNames = replaceName.split('.');
		if(dotNotationNames.length === 1){
			this._set(dotNotationNames[0], replacement);
		}
		else {
			
			if(dotNotationNames.length === 2) {
				this._set(dotNotationNames[0], {
					[dotNotationNames[1]]: replacement
				});
			}
			else {
				const dotNotObject = this.createDotNotationObject(dotNotationNames[dotNotationNames.length - 1], replacement, dotNotationNames);
				this._set(dotNotationNames[0], dotNotObject);
			}
		}
	}

	
	public rewireStub(func: string) {
		const dotNotationNames = func.split('.');
		const stub = this._sandbox.stub();
		if(dotNotationNames.length === 1){
			this._set(dotNotationNames[0], stub);
		}
		else {
			
			if(dotNotationNames.length === 2) {
				this._set(dotNotationNames[0], {
					[dotNotationNames[1]]: stub
				});
			}
			else {
				const dotNotObject = this.createDotNotationObject(dotNotationNames[dotNotationNames.length - 1], stub, dotNotationNames);
				this._set(dotNotationNames[0], dotNotObject);
			}
		}
		
		return stub;
	}

	private createDotNotationObject(replaceName: string, replacement:unknown, dotNotationNames: string[]) {
		
		let dotNotObject: NestedObject = {};
		while(dotNotationNames.length > 1){
			const dotName = dotNotationNames.pop();
			if(!dotName){
				break;
			}
			else if(Object.keys(dotNotObject).length === 0){
				dotNotObject = {[dotName]: {
					[replaceName]: replacement
				}};
			}
			else {
				dotNotObject = {[dotName]: dotNotObject};
			}
		}

		return dotNotObject;
	}

	public get sandbox() {
		return this._sandbox;
	}

	
	public restoreAll(): void {
		
		this.restoreRewire();
		this.restoreSinonSandbox();
		
	}

	public restoreSinonSandbox() {
		this._sandbox.restore();
	}

	public restoreRewire() {
		while (this.restoreFunctions.length) {
			const restoreFunction = this.restoreFunctions.pop();
			if (restoreFunction) {
				restoreFunction();
			}
		}
	}
}

suite('Extension Test Suite',  () => {

	const tExt = new TestClass("../../extension");
	
	before(async function() {
		await vscode.window.withProgress({location:vscode.ProgressLocation.Notification, title: "Starting Tests...", cancellable:false}, async () => {
			await new Promise((resolve) => setTimeout(()=>{ resolve(undefined);}, 500));
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let msgDebugStub: sinon.SinonStub;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let msgInfoStub: sinon.SinonStub;

	beforeEach(() => {
		msgDebugStub = tExt.sandbox.stub(msg, "debug");
		msgInfoStub = tExt.sandbox.stub(msg, "info");
	});
	
	afterEach(() => {
		tExt.restoreAll();		
	});

	describe("getSearchFolders", () => {

		const getSearchFolders = tExt.getFunction("getSearchFolders");

		it("should return an empty array when pathSegments length is less than numWorkspacePathSegments", () => {
			const result = getSearchFolders(2, ["workspace"]);
			expect(result).to.have.same.members([]);
		});
	
		it("should return the correct slice of pathSegments", () => {
			const result = getSearchFolders(1, ["workspace", "path", "segment1", "segment2"]);
			expect(result).to.have.same.members(["path", "segment1", "segment2"]);
		});
	});

	describe('getFolderSegmentsFromPath', function() {

		const getFolderSegmentsFromPath = tExt.getFunction("getFolderSegmentsFromPath");
		
		it('should split a string into an array of segments based on either / or \\ as separators', function() {
			const path1 = '/home/user/documents';
			const expectedOutput1 = ['', 'home', 'user', 'documents'];
			expect(getFolderSegmentsFromPath(path1)).to.have.same.members(expectedOutput1);
			
			const path2 = 'C:\\Windows\\System32';
			const expectedOutput2 = ['C:', 'Windows', 'System32'];
			expect(getFolderSegmentsFromPath(path2)).to.have.same.members(expectedOutput2);
		});
	});

	describe('findFriendFile', () => {
		
		const findFriendFile = tExt.getFunction<Promise<vscode.Uri | undefined>>("findFriendFile");
		const mockWorkspaceFolder: vscode.WorkspaceFolder = { name: 'test-workspace', uri: vscode.Uri.file('/path/to/workspace'), index: 0 };
		const mockSearchFolders: string[] = ['folder1', 'folder2'];
		const mockFileName = 'testFile.h';
		let stubFindFiles: sinon.SinonStub;
		

		beforeEach(() => {
			stubFindFiles = tExt.sandbox.stub(vscode.workspace, "findFiles");
		});
		
					
		it('should return the first found file', async () => {
			
			const uriReturn = [{ fsPath: '/path/to/foundfile/folder1/folder2/testFile.h' }] as vscode.Uri[];
			
			stubFindFiles.resolves(uriReturn); 
			
	
			const result = await findFriendFile(mockFileName, mockWorkspaceFolder, mockSearchFolders);
		
			expect(stubFindFiles.calledOnceWith(sinon.match.any, undefined , 1)).to.be.true;	
			expect(result?.fsPath).to.equal('/path/to/foundfile/folder1/folder2/testFile.h');

		});

		it('should return no files found, stop searching after reaching workspace dir, and return undefined', async () => {
						
			stubFindFiles.resolves([]); 
			
			const result = await findFriendFile(mockFileName, mockWorkspaceFolder, mockSearchFolders);

			expect(stubFindFiles.calledThrice).to.be.false;
			expect(stubFindFiles.calledTwice).to.be.true;
			
			expect(result).to.be.undefined;

		});

		it('should return uri after findFiles called twice', async () => {
			
			const uriReturn = [{ fsPath: '/path/to/foundfile/folder1/testFile.h' }] as vscode.Uri[];
			
			stubFindFiles.onFirstCall().resolves([]);
			stubFindFiles.onSecondCall().resolves(uriReturn);
						
			const result = await findFriendFile(mockFileName, mockWorkspaceFolder, mockSearchFolders);
		
			expect(stubFindFiles.calledTwice).to.be.true;

			expect(stubFindFiles.firstCall.calledWith(sinon.match.any, undefined, 1)).to.be.true;
			const firstCallInclude = stubFindFiles.firstCall.args[0] as vscode.RelativePattern;
			expect(firstCallInclude.pattern).to.equal("folder1/folder2/**/testFile.h");

			const secondCallInclude = stubFindFiles.secondCall.args[0] as vscode.RelativePattern;
			const secondCallExclude = stubFindFiles.secondCall.args[1] as vscode.RelativePattern;
			expect(secondCallInclude.pattern).to.equal("folder1/**/testFile.h");
			expect(secondCallExclude.pattern).to.equal("folder1/folder2");

			expect(result?.fsPath).to.equal('/path/to/foundfile/folder1/testFile.h');
		});

		it('With no search folders should return undefined and findFiles called 0 times', async () => {
			stubFindFiles.resolves([]);

			const result = await findFriendFile(mockFileName, mockWorkspaceFolder, []);
			
			expect(stubFindFiles.callCount).to.equal(0);
			expect(result).to.be.undefined;
		});
		
	});

	// TODO --------------------------------------------------------------------------------------------------------------------------

	// describe('getFriendExtension', () => {
		
	// 	const getFriendExtension = tExt.getFunction("getFriendExtension");
	// 	const switchExtensions: SwitchExtensions = ["h,hpp", "c,cpp"];

	// 	it('should return undefined if fileSwitchExtensions is not provided or its length is not equal to 2', () => {
	// 		expect(getFriendExtension('.cpp', undefined as unknown as SwitchExtensions)).to.be.undefined;
	// 		expect(getFriendExtension('.cpp', [] as unknown as SwitchExtensions)).to.be.undefined;
	// 		expect(getFriendExtension('.cpp', ['h,hpp'] as unknown as SwitchExtensions)).to.be.undefined;
	// 		expect(getFriendExtension('.js', ['h,hpp', 'c,cpp', 'tsx'] as unknown as SwitchExtensions)).to.be.undefined;
	// 	});

	// 	it('should return the friend extension if the provided extension is in fileSwitchExtensions[0]', () => {
	// 		expect(getFriendExtension('.h', switchExtensions)).to.equal('c,cpp');
	// 		expect(getFriendExtension('.hpp', switchExtensions)).to.equal('c,cpp');
	// 	});

	// 	it('should return the friend extension if the provided extension is in fileSwitchExtensions[1]', () => {
	// 		expect(getFriendExtension('.c', switchExtensions)).to.equal('h,hpp');
	// 		expect(getFriendExtension('.cpp', switchExtensions)).to.equal('h,hpp');
	// 	});

	// 	it('should return undefined if the provided extension is not in either fileSwitchExtensions[0] or fileSwitchExtensions[1]', () => {
	// 		expect(getFriendExtension('.css', switchExtensions)).to.be.undefined;
	// 		expect(getFriendExtension('.html', switchExtensions)).to.be.undefined;
	// 	});
	// });


	describe('storeSwitchPath', () => {
		//test isCacheDisabled   ---------------------------------------------------------------------------------------------------------------------------------
		const storeSwitchPath = tExt.getFunction("storeSwitchPath");

		let resetStub: sinon.SinonStub;
		let storePathFromCacheStub: sinon.SinonStub;
		let setIsStoringSwitchFileStub: sinon.SinonStub;
		let getFriendFileNameStub: sinon.SinonStub;
		let getFriendFileStub: sinon.SinonStub;
		//let getWorkspaceFolderStub: sinon.SinonStub;
		//let uriFileStub: sinon.SinonStub;
		let setCurrentSwitchUriStub: sinon.SinonStub;


				
		beforeEach(() => {
			resetStub = tExt.rewireStub("reset");
			storePathFromCacheStub = tExt.rewireStub("storePathFromCache");
			setIsStoringSwitchFileStub = tExt.rewireStub("setIsStoringSwitchFile");
			getFriendFileNameStub = tExt.rewireStub("getFriendFileName");
			getFriendFileStub = tExt.rewireStub("getFriendFile");
			setCurrentSwitchUriStub = tExt.rewireStub("setCurrentSwitchUri");
		});


		it('should reset and return if currentFilePath is undefined', async () => {
			await storeSwitchPath(undefined);
			expect(resetStub.calledOnce).to.be.true;
			expect(storePathFromCacheStub.notCalled).to.be.true;
		});

		it('should not reset or call other functions if storePathFromCache returns "success"', async () => {
			storePathFromCacheStub.returns('success');
			await storeSwitchPath('/path/to/file.cpp');

			expect(resetStub.notCalled).to.be.true;
			expect(storePathFromCacheStub.calledOnce).to.be.true;
			expect(setIsStoringSwitchFileStub.calledOnce).to.be.true;
			expect(getFriendFileNameStub.notCalled).to.be.true;
		});

		it('should reset and return if getFriendFileName returns undefined', async () => {
			
			storePathFromCacheStub.returns("fail");
			getFriendFileNameStub.returns(undefined);
			await storeSwitchPath('/path/to/file.cpp');

			expect(getFriendFileNameStub.calledOnce).to.be.true;
			expect(resetStub.calledOnce).to.be.true;
			expect(getFriendFileStub.notCalled).to.be.true;
		});

		it('should reset and return if getFriendFile returns undefined', async () => {
			storePathFromCacheStub.returns("fail");
			getFriendFileNameStub.returns("file.h");
			getFriendFileStub.returns(undefined);
			await storeSwitchPath('/path/to/file.cpp');

			expect(getFriendFileNameStub.calledOnce).to.be.true;
			expect(getFriendFileNameStub.calledOnce).to.be.true;
			expect(getFriendFileStub.calledOnce).to.be.true;

			expect(resetStub.calledOnce).to.be.true;
			expect(setCurrentSwitchUriStub.notCalled).to.be.true;
			
		});

		it('should set currentSwitchUri and pathCache if all conditions are met', async () => {
			const friendUri = { fsPath: '/path/to/file.h' };
			const pathCacheSetStub = tExt.rewireStub("pathCache.set");
			
			storePathFromCacheStub.returns("fail");
			getFriendFileNameStub.returns("file.h");
			getFriendFileStub.returns(friendUri);

			await storeSwitchPath('/path/to/file.cpp');

			expect(getFriendFileNameStub.calledOnce).to.be.true;
			expect(getFriendFileStub.calledOnce).to.be.true;

			expect(setCurrentSwitchUriStub.calledOnce).to.be.true;
			expect(setIsStoringSwitchFileStub.calledOnce).to.be.true;
			expect(pathCacheSetStub.calledOnce).to.be.true;

			expect(resetStub.notCalled).to.be.true;

		});
	});


	describe('getMainWorkspaceFolder', () => {
		const getMainWorkspaceFolder = tExt.getFunction("getMainWorkspaceFolder");

		let workspaceFileStub: sinon.SinonStub;
		let getWorkspaceFolderStub: sinon.SinonStub;
		let workspaceFoldersStub: sinon.SinonStub;
		
		const mockWorkspaceFolder: vscode.WorkspaceFolder = {
			uri: vscode.Uri.parse(''),
			name: '',
			index: 0,
		};

		const mockWorkspaceFolders: readonly vscode.WorkspaceFolder[] = [
			{
				uri: vscode.Uri.parse(''),
				name: '',
				index: 0,
			}
		];

		beforeEach(() => {
			workspaceFileStub = tExt.sandbox.stub(vscode.workspace, 'workspaceFile');
			workspaceFoldersStub = tExt.sandbox.stub(vscode.workspace, 'workspaceFolders');
			getWorkspaceFolderStub = tExt.sandbox.stub(vscode.workspace, 'getWorkspaceFolder');
		});
		
		it('should return the workspace folder if vscode.workspace.workspaceFile is defined', () => {
			
	
			workspaceFileStub.value({} as vscode.Uri);
			getWorkspaceFolderStub.returns(mockWorkspaceFolder);
	
			const result = getMainWorkspaceFolder();
	
			expect(result).to.equal(mockWorkspaceFolder);
		});
	
		it('should return the first workspace folder if vscode.workspace.workspaceFile is undefined', () => {
				
			workspaceFileStub.value(undefined);
			workspaceFoldersStub.value(mockWorkspaceFolders);
	
			const result = getMainWorkspaceFolder();
	
			expect(result).to.equal(mockWorkspaceFolders[0]);
		});
	
		it('should return undefined if there are no workspace folders', () => {
			workspaceFileStub.value(undefined);
			workspaceFoldersStub.value([]);
	
			const result = getMainWorkspaceFolder();
	
			expect(result).to.be.undefined;
		});
	});

	describe('getFriendFile', () => {
		const getFriendFile = tExt.getFunction("getFriendFile");

		let getFolderSegmentsFromPathStub: sinon.SinonStub;
		let findFriendFileStub: sinon.SinonStub;
		let getSearchFoldersStub: sinon.SinonStub;

		beforeEach(() => {
			getFolderSegmentsFromPathStub = tExt.rewireStub("getFolderSegmentsFromPath");
			findFriendFileStub = tExt.rewireStub("findFriendFile");
			getSearchFoldersStub = tExt.rewireStub("getSearchFolders");
		});

		it('should return undefined if currentFileWorkspace is undefined', async () => {
			const result = await getFriendFile(undefined, 'friendFileName', 'firstSearchDir');
			expect(result).to.be.undefined;
			
		});

		it('should return undefined if searchFolders is empty', async () => {
			const currentFileWorkspace = { uri: { fsPath: 'path' } };
			getFolderSegmentsFromPathStub.returns(['segment']);
			getSearchFoldersStub.returns([]);

			const result = await getFriendFile(currentFileWorkspace, 'friendFileName', 'firstSearchDir');
			expect(result).to.be.undefined;
			
		});

		it('should call findFriendFile with correct arguments', async () => {
			const currentFileWorkspace = { uri: { fsPath: 'path' } };
			getFolderSegmentsFromPathStub.returns(['segment']);
			getSearchFoldersStub.returns(['searchFolder']);

			await getFriendFile(currentFileWorkspace, 'friendFileName', 'firstSearchDir');
			expect(findFriendFileStub.calledOnceWithExactly('friendFileName', currentFileWorkspace, ['searchFolder'])).to.be.true;
		});
	});

	describe("getFriendFileName", function () {
		const getFriendFileName = tExt.getFunction("getFriendFileName");

		let getFriendExtensionStub: sinon.SinonStub;
		let cfgGetFileSwitchExtensionsStub: sinon.SinonStub;

		beforeEach(function () {
			getFriendExtensionStub = tExt.rewireStub('getFriendExtension');
			cfgGetFileSwitchExtensionsStub = tExt.rewireStub("cfg.getFileSwitchExtensions");
		});

		it("should return undefined if currentExtension is not provided", function () {
			const result = getFriendFileName('test', undefined);
			expect(result).to.be.undefined;
		});

		it("should return undefined if friendExts is not returned from getFriendExtension", function () {
			cfgGetFileSwitchExtensionsStub.returns(['ext1', 'ext2']);
			getFriendExtensionStub.returns(undefined);
			const result = getFriendFileName('test', 'ext');
			expect(result).to.be.undefined;
		});

		it("should return the correct filename if currentName and currentExtension are provided", function () {
			cfgGetFileSwitchExtensionsStub.returns(['ext1', 'ext2']);
			getFriendExtensionStub.returns('ext1');
			const result = getFriendFileName('test', 'ext');
			expect(result).to.equal('test.{ext1}');
		});
	});

	describe('storePathFromCache', () => {
		const storePathFromCache = tExt.getFunction("storePathFromCache");

		
		let setCurrentSwitchUriStub: sinon.SinonStub;

		beforeEach(() => {
			
			setCurrentSwitchUriStub = tExt.rewireStub("setCurrentSwitchUri");
		});

		
		it('should return "fail" if the current file path is not in the cache', () => {
			const result = storePathFromCache('/path/to/file.h');

			expect(result).to.equal('fail');
			
		});

		it('should return "success" if the current file path is in the cache', () => {
			const currentFilePath = '/path/to/file.cpp';
			const friendPath = '/path/to/file.h';
			const pathCache = tExt.getModuleItem<MapQueue>("pathCache");
			pathCache.set(currentFilePath, '/path/to/file.h');
			const result = storePathFromCache(currentFilePath);

			expect(result).to.equal('success');
			expect(setCurrentSwitchUriStub.calledWith(vscode.Uri.file('/path/to/file.h'))).to.be.true;
			const friendPathCheck = pathCache.get(currentFilePath);
			expect(friendPath === friendPathCheck).to.be.true;
		});
	});
});
