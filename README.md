Crosswalk App Tools iOS Backend
===================

The iOS backend for Crosswalk application command line tools to create and package Crosswalk iOS applications.

### Installation

iOS backend only works on Mac OS X. The following components are required:
  1. [Xcode](https://developer.apple.com/xcode/) 7 above
    * Install Xcode through [Mac App Store](https://itunes.apple.com/en/app/xcode/id497799835?mt=12)

  2. [Node.js](https://nodejs.org/en/) and [NPM](https://www.npmjs.com/)
    * Use [HomeBrew](http://brew.sh/) or [MacPorts](http://www.macports.org/) to install Node.js and NPM.

  3. Git & Ruby
    * Should be pre-installed on your Mac already.

  4. [CocoaPods](https://cocoapods.org/)
    * Install CocoaPods through ruby gem: `sudo gem install cocoapods`.

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

1. Clone App Tool:
  ```
  git clone https://github.com/crosswalk-project/crosswalk-app-tools.git
  ```

2. Install App Tool's dependencies:
  ```
  cd crosswalk-app-tools
  npm install
  ```

3. Install iOS backend:
  ```
  cd node_modules
  git clone https://github.com/crosswalk-project/crosswalk-app-tools-ios.git crosswalk-app-tools-backend-ios
  cd crosswalk-app-tools-backend-ios
  npm install
  cd ../..
  ```

4. The main script is `crosswalk-app-tools/src/crosswalk-app`. Add it into PATH environment variable, or invoke the script within the directory path.

### License
Crosswalk App Tools iOS Backend is available under the Apache V2 license. See the [LICENSE](LICENSE-APACHE-V2) file for more info.
