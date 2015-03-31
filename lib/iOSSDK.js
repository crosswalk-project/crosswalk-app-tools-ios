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
function iOSSDK(config) {
    var project_path = Shell.pwd();
    var projectId = Path.basename(project_path);
    this._sign = null;
    this._provision = null;
    if (typeof(config) != 'undefined' && config != null) {
        project_path = typeof(config.path) != 'undefined'?config.path:project_path;
        projectId = typeof(config.id) != 'undefined'?config.id:Path.basename(project_path);
        this._sdk = typeof(config.sdk) != 'undefined'?config.sdk:'iphoneos';
        this._sign = typeof(config.sign) != 'undefined'?config.sign:null;
        this._provision = typeof(config.provision) != 'undefined'?config.provision:null;
    }
    this._project_path = project_path;
    this._project_id = projectId;
    var parts = projectId.split('.');
    this._project_name = parts[parts.length-1];
    this._project_path = Fs.realpathSync(project_path);
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
    var xcodeproj_path = Path.join(this._project_path, this._project_name + '.xcodeproj');
    var archs_param = '';
    if (archs != null) {
        archs_param = 'ARCHS="' + archs.join(' ') + '"';
    }
    var configuration = release?'Release':'Debug';
    return ['xcodebuild', '-project', xcodeproj_path, archs_param,
            '-target', this._project_name, '-configuration', configuration,
            '-sdk', this._sdk, 'build', 'CONFIGURATION_BUILD_DIR=' + this._build_path,
            'ALWAYS_SEARCH_USER_PATHS=YES',
            'USER_HEADER_SEARCH_PATHS=' + Path.join(this._project_path, 'Libs', 'XWalkView.framework', 'Headers'),
            'VALID_ARCHS="' + ['arm64', 'armv7', 'armv7s'].join(' ') + '"'].join(' ');
}

/**
 * getXcrunCmd
 * @return The xcrun command string
 */
iOSSDK.prototype.getXcrunCmd = function() {
    var cmd = ['xcrun', '-sdk', this._sdk, 'PackageApplication', '-v', this._app_path, '-o', this._ipa_path];
    if (this._sign != null) {
        cmd = cmd.concat(['--sign', '"' + this._sign + '"']);
    }
    if (this._provision != null) {
        cmd = cmd.concat(['--embed', '"' + this._provision + '"']);
    }
    return cmd.join(' ');
}

/**
 * build
 * @param {Array} archs ARCHS to build for.
 * @param {Boolean} release The release version.
 * @return {Boolean} If the command get success.
 */
iOSSDK.prototype.build = function(archs, release) {
    Shell.pushd(this._project_path);
    var ret = Shell.exec(this.getBuildCmd(archs, release)) && Shell.exec(this.getXcrunCmd());
    Shell.popd();
    return ret;
}

/**
 * cmd
 * @param {Array} archs ARCHS to build for.
 * @param {Boolean} release The release version.
 */
iOSSDK.prototype.cmd = function(archs, release) {
    console.log(this.getBuildCmd(archs, release));
    console.log(this.getXcrunCmd());
}

module.exports = iOSSDK;
