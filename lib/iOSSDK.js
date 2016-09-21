// Copyright © 2015 Intel Corporation. All rights reserved.
// Use  of this  source  code is  governed by  an Apache v2
// license that can be found in the LICENSE-APACHE-V2 file.

var Fs = require('fs');
var Path = require('path');
var Shell = require('shelljs');

/**
 * iOSSDK
 * @param {Dictionary} config the config to the project
 * @return
 */
function iOSSDK(application, config) {
    var project_path = Shell.pwd();
    var projectId = Path.basename(project_path);
    this._application = application;
    this._sign = null;
    this._provision = null;
    if (typeof(config) != 'undefined' && config != null) {
        project_path = typeof(config.path) != 'undefined'?config.path:project_path;
        projectId = typeof(config.id) != 'undefined'?config.id:Path.basename(project_path);
        this._version = typeof(config.version) != 'undefined' ? config.version : '0.1';
        this._sdk = typeof(config.sdk) != 'undefined'?config.sdk:'iphoneos';
        this._sign = typeof(config.sign) != 'undefined'?config.sign:null;
        this._provision = typeof(config.provision) != 'undefined'?config.provision:null;
    }
    this._project_path = Fs.realpathSync(project_path);
    this._project_id = projectId;
    var parts = projectId.split('.');
    this._project_name = parts[parts.length-1];
    this._build_path = Path.join(this._project_path, 'build');
    if (!Shell.test('-d', this._build_path)) {
        Shell.mkdir('-p', this._build_path);
    }
    this._ipa_path = Path.join(this._build_path, this._project_name + '.ipa');
    this._app_path = Path.join(this._build_path, this._project_name + '.app');
}

/**
 * getBuildCmd
 * @param {Array} archs the array of target archs to build, like ['armv7', 'armv7s'].
 * @param {Boolean} release The build configuration, if it's 'true', means 'Release', 'Debug' for otherwise.
 * @return the build command string
 */
iOSSDK.prototype.getBuildCmd = function(archs, release) {
    var xcworkspace_path = Path.join(this._project_path, 'AppShell.xcworkspace');
    var archs_param = '';
    if (archs != null) {
        archs_param = 'ARCHS="' + archs.join(' ') + '"';
    }
    var configuration = release?'Release':'Debug';
    return ['xcodebuild', '-workspace', xcworkspace_path, '-scheme Pods-AppShell',
            '-configuration', configuration, archs_param, '-sdk', this._sdk,
            'PRODUCT_BUNDLE_IDENTIFIER=' + this._project_id,
            'TARGET_NAME=' + this._project_name,
            '-archivePath', 'archived', 'archive'
           ].join(' ');
}

/**
 * getExportCmd
 * @return The export command string
 */
iOSSDK.prototype.getExportCmd = function() {
    var cmd = ['xcodebuild', '-exportArchive', '-archivePath', 'archived.xcarchive',
              '-exportPath', 'export', '-exportOptionsPlist', 'exports.plist'
    ];
    return cmd.join(' ');
}

iOSSDK.prototype.prepareExport = function() {
    var output = this._application.output;
    var Plist = require('plist');
    var infoPath = Path.join('archived.xcarchive', 'Info.plist');
    var info = Plist.parse(Fs.readFileSync(infoPath, 'utf8'));
    info.ApplicationProperties.CFBundleShortVersionString = this._version;
    info.Name = this._project_name;
    info.SchemeName = this._project_name;
    Fs.writeFileSync(infoPath, Plist.build(info));

    var exportsPlist = Plist.build({
        method: 'ad-hoc',
        thinning: '<none>'
    });
    Fs.writeFileSync('exports.plist', exportsPlist);
}

iOSSDK.prototype.cleanupExport = function() {
    Shell.rm('exports.plist');
}

/**
 * build
 * @param {Array} archs ARCHS to build for.
 * @param {Boolean} release The release version.
 * @return {Boolean} If the command get success.
 */
iOSSDK.prototype.build = function(archs, release) {
    var output = this._application.output;
    var that = this;

    Shell.pushd(this._project_path);

    return new Promise(function(resolve, reject){
        var progress = output.createInfiniteProgress('Build application');
        var counter = 0;
        var intervalId = setInterval(function(c) {
            progress.update('in progress: ' + ++counter);
        }, 1000);
        Shell.exec(that.getBuildCmd(archs, release), {async:true}, function(code, out){
            clearInterval(intervalId);
            progress.done('Built.');
            if (code == 0) {
                resolve();
            } else {
                reject({code: code, out: out, cmd: that.getBuildCmd(archs, release)});
            }
        });
    }).then(function(){
        return new Promise(function(resolve, reject){
            var progress = output.createInfiniteProgress('Sign and export package');
            var counter = 0;
            var intervalId = setInterval(function(){
                progress.update('in progress: ' + ++counter);
            }, 1000);
            that.prepareExport();
            Shell.exec(that.getExportCmd(), {async:true}, function(code, out){
                that.cleanupExport();
                clearInterval(intervalId);
                progress.done('Exported.');
                Shell.popd();
                if (code == 0) {
                    resolve();
                } else {
                    output.error('Failed to export application, with return code: ' + code + ', error message: ' + out);
                    reject(code, out);
                }
            });
        });
    }, function(res){
        output.error('Failed to build application, with return code: ' + res.code + ', error message: ' + res.out);
        output.error('Build command was: ' + res.cmd);
    });
}

/**
 * cmd
 * @param {Array} archs ARCHS to build for.
 * @param {Boolean} release The release version.
 */
iOSSDK.prototype.cmd = function(archs, release) {
    console.log(this.getBuildCmd(archs, release));
    console.log(this.getExportCmd());
}

module.exports = iOSSDK;
