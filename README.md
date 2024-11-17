# File Switcher - VSCode Extension

This was made for Unreal development using clangd but can be used for anything.

clangd doesn't like Unreal Source files so the Alt+O shortcut doesn't work a lot of the time(switches to wrong file). This extension uses simpler methods when switching files using Alt+O.

## Installation
1. Download .vsix file from this github
2. Open VSCode and click the 'Extensions' icon on the left panel
3.  Look for the `...` (three dots) at the top of the Extensions panel(left side), click on it, and select Install from VSIX...

## Setup
After installing you'll need to adjust your Alt+O keyboard shortcut for other extensions

`Note:` You don't have to delete these keyboard shortcuts you can just change them to something else.

 For example I change these shortcuts below to Control+Shift+Alt+O (`clangd` and `C/C++`)
 
![](https://private-user-images.githubusercontent.com/62588629/386926066-9e03add4-c0c1-44e2-96ca-1e8c6a69c655.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MzE4MjYwNTIsIm5iZiI6MTczMTgyNTc1MiwicGF0aCI6Ii82MjU4ODYyOS8zODY5MjYwNjYtOWUwM2FkZDQtYzBjMS00NGUyLTk2Y2EtMWU4YzZhNjljNjU1LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDExMTclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMTE3VDA2NDIzMlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTIwOWFkMDc1OTA0ZDQwYzc5ZjM5MjhkYzY0MmRjZTE4M2I1Y2E1ZGZkZjk5MzViMjAxYmE5ZWViMTFkNTllYWUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.2_J0o0lC3RRofT5s__wUgomQkuZPZ4PhwA4d8lWBoxE)

`Note:` You can see above that there are two clangd entries.
* This is because there was an update to clangd keyboard shortcuts
* They updated their extension to a more advanced 'When' clause
* So if you notice the Alt+O shortcut not working correctly, recheck if an update added a new/different Alt+O keyboard shortcut to an extension
* I kept the two clangd entries for demonstration purposes. I will delete the older one.

## Extension Settings

This extension contributes the following settings:

* `file-switcher.extensions`: Two strings of extensions separated by ','

    * These strings determine the file extension that are compatable to this extension.
* `file-switcher.log.logLevel`: logging for the extension
* `file-switcher.cache.pathCount`: Cache path count for storing paths for faster retrieval




## Release Notes

See [changelog](/CHANGELOG.md)

---

