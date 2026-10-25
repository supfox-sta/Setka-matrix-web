"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RuntimeModule = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _events = require("events");

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } } /*
                                                                                                                                                                                                                                                                                                                                          Copyright 2022 The Matrix.org Foundation C.I.C.
                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                          Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                          you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                          You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                              http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                          Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                          distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                          WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                          See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                          limitations under the License.
                                                                                                                                                                                                                                                                                                                                          */

// TODO: Type the event emitter with AnyLifecycle (extract TypedEventEmitter from js-sdk somehow?)
// See https://github.com/matrix-org/matrix-react-sdk-module-api/issues/4

/**
 * Represents a module which is loaded at runtime. Modules which implement this class
 * will be provided information about the application state and can react to it.
 */
var RuntimeModule = /*#__PURE__*/function (_EventEmitter) {
  (0, _inherits2["default"])(RuntimeModule, _EventEmitter);

  var _super = _createSuper(RuntimeModule);

  function RuntimeModule(moduleApi) {
    var _this;

    (0, _classCallCheck2["default"])(this, RuntimeModule);
    _this = _super.call(this);
    _this.moduleApi = moduleApi;
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "extensions", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "moduleName", RuntimeModule.name);
    return _this;
  }
  /**
   * Run a string through the translation engine. Shortcut to ModuleApi#translateString().
   * @param s The string.
   * @param variables The variables, if any.
   * @returns The translated string.
   * @protected
   */


  (0, _createClass2["default"])(RuntimeModule, [{
    key: "t",
    value: function t(s, variables) {
      return this.moduleApi.translateString(s, variables);
    }
  }]);
  return RuntimeModule;
}(_events.EventEmitter);

exports.RuntimeModule = RuntimeModule;