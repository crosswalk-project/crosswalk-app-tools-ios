Crosswalk App Tools iOS Backend
===================

The iOS support backend for Crosswalk app command line tools to create and package Crosswalk iOS applications.

Crosswalk-app-tools is in very early stages of development, and not suitable for use in a production environment. "Releases" and announcements are made available as a technology preview only. No packages are being published at this time, but git tags serve as reference points for release milestones.

### Installation

Mac OS X is the only tested platform. The following component are required:
  1. Xcode iOS SDK 8.1 above and the Xcode command line tools
  2. Node.js and NPM
  3. Git

In order to get the `crosswalk-app` script available everywhere, global NPM installation is required.
```
npm install -g crosswalk-app-tools
npm install -g crosswalk-app-tools-backend-ios
```

### Usage

For the detailed usage, please refer to the `Usage` section in [Crosswalk App tools](https://github.com/crosswalk-project/crosswalk-app-tools.git).

To create an iOS project, use:
```
crosswalk-app create <package-id> --platforms=ios     Create project <package-id>
                                                      for platform iOS.
```

### Run development versions from git

1. Download App Tool: `git clone https://github.com/crosswalk-project/crosswalk-app-tools.git`.
2. Install dependencies: `cd crosswalk-app-tools`, then `npm install`.
3. Install iOS backend: `cd node_modules`, clone iOS backend: `git clone https://github.com/crosswalk-project/crosswalk-app-tools-ios.git crosswalk-app-tools-backend-ios`, then install dependencies: `cd crosswalk-app-tools-backend-ios; npm install; cd ../..`.
4. The main script is `crosswalk-app-tools/src/crosswalk-app`. Set environment PATH or invoke with directory.

### License
Crosswalk App Tools iOS Backend is available under the Apache V2 license. See the [LICENSE](LICENSE-APACHE-V2) file for more info.
