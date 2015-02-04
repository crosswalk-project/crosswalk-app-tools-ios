// Copyright © 2014 Intel Corporation. All rights reserved.
// Use  of this  source  code is  governed by  an Apache v2
// license that can be found in the LICENSE-APACHE-V2 file.

var Config = null;
var Console = null;
var Downloader = null;
var Shell = require ("shelljs");
var Path = require ('path');

/**
 * Interface for project implementations.
 * @constructor
 * @protected
 */
function iOSProject(application) {
    this._application = application;
    if (typeof(application) != 'undefined' && application != null) {
        Config = typeof(application.getConfig) != 'function'?null:application.getConfig();
        Console = typeof(application.getConsole) != 'function'?console:application.getConsole();
    } else {
        Console = console;
    }
}

/**
 * Generate project template.
 * @function generate
 * @param {String} packageId Package name in com.example.Foo format.
 * @param {Function} callback see {@link Project~projectOperationCb}.
 * @abstract
 * @memberOf Project
 */
iOSProject.prototype.generate =
function(packageId, callback) {

    // TODO implement generation of project.
    Console.log("iOSProject: Generating " + packageId);

    var template_dir = Path.join(__dirname, '..', 'data', 'AppShell');
    var parts = packageId.split('.');
    var project_name = parts[parts.length - 1];
    var project_dir = Path.join(Shell.pwd(), packageId);

    if (project_name == "" || project_name == null) {
        callback("Please provide the project name.");
        return;
    }

    if (Shell.test('-d', project_dir)) {
        callback("The project has been already existed: " + project_dir);
        return;
    }

    if (!Shell.test('-d', template_dir)) {
        callback("Can not find project template files: " + template_dir);
        return;
    }

    Shell.cp('-Rf', template_dir, Shell.pwd());
    Shell.mv('AppShell', project_dir);
    Shell.pushd(project_dir);
    Shell.ls (".").filter (function (file) {
        var new_file = file.replace (/AppShell/gi, project_name);
        if (file != new_file)
            Shell.mv ('-f', file, new_file);
    });
    var xcodeproj = project_name+".xcodeproj";
    Shell.find (xcodeproj).filter (function (file) {
        if (Shell.test ('-f', file)) {
            Shell.sed ('-i', /AppShell/gi, project_name, file);
            Shell.mv('-f', file, file.replace (/AppShell/gi, project_name));
        }
    });

    // Replace package name in info.plist.
    var info_file = Path.join(project_dir, project_name, 'Info.plist');
    var project_name_prefix = Path.basename(project_dir, '.' + project_name);
    if (Shell.test('-f', info_file)) {
        Shell.sed('-i', /org.crosswalk-project/gi, project_name_prefix, info_file);
    }
    Shell.popd();

    // Null means success, error string means failure.
    callback(null);
};

iOSProject.prototype.update =
function(callback) {

    // TODO implement updating of project to new Crosswalk version.
    // This function is not supported yet.
    Console.log("iOSProject: Updating project has not implemented.");

    // Null means success, error string means failure.
    callback(null);
};

iOSProject.prototype.refresh =
function(callback) {

    // TODO implement updating of project to new Crosswalk version.
    // Maybe this function will be not needed, and removed in the future.
    Console.log("iOSProject: Refreshing project has not implemented.");

    // Null means success, error string means failure.
    callback(null);
};

/**
 * Build application package.
 * @function build
 * @param {String[]} abi Array of ABIs, supported armeabi-v7a, x86.
 * @param {Boolean} release Whether to build debug or release package.
 * @param {Function} callback see {@link Project~projectOperationCb}.
 * @abstract
 * @memberOf Project
 */
iOSProject.prototype.build =
function(abis, release, callback) {

    // TODO implement updating of project to new Crosswalk version.
    Console.log("iOSProject: Building project");

    var Fs = require ('fs');

    var project_dir = Shell.pwd();
    var parts = Path.basename(project_dir).split('.');
    var project_name = parts[parts.length-1];

    if (project_name == "" || project_name == null) {
        console.log("Please provide the project name.");
        return;
    }

    Console.log('Start to update the web resources.');
    Shell.pushd(project_dir);
    var project_path = Path.join(project_dir, project_name + '.xcodeproj', 'project.pbxproj');
    var project = require ('xcode').project(project_path);
    var Manifest = require(Path.join(project_dir, 'www', 'manifest.json'));
    project.parse(function (err) {
        Fs.writeFileSync(Path.join(project_dir, 'www', 'manifest.plist'), require('plist').build(Manifest));
        // Add the real resource files.
        Shell.pushd(Path.join(project_dir, 'www'));
        // Remove the default resource files first.
        project.removeResourceFile('index.html');
        project.removeResourceFile('icon.png');
        Shell.find('.').filter(function (file) {
            if (Shell.test('-f', file)) {
                project.addResourceFile(file);
            }
        });
        Shell.popd();

        Fs.writeFileSync(project_path, project.writeSync());
        Console.log('Finished update resources.');
        var iosParser = require('app-parser').iosParser;
        var proj_path = iosParser.getProjectPath(project_dir);
        var build_path = Path.join(project_dir, 'Build');
        Shell.mkdir('-p', build_path);
        var ipa_path = Path.join(build_path, project_name + '.ipa');
        var app_path = Path.join(build_path, project_name + '.app');
        Console.log('Start to build ipa file.');
        require('ipa-build')(proj_path, ipa_path, build_path, project_name, app_path);
        Console.log('Finished, look at the ' + ipa_path);
    });
    Shell.popd();
    // Null means success, error string means failure.
    callback(null);
};

module.exports = iOSProject;
