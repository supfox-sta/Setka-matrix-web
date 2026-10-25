"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExperimentalExtensionsBase = exports.DefaultExperimentalExtensions = void 0;

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

/*
Copyright 2023 Verji Tech AS
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

/**
 * Mostly for test. To ensure we handle more than one module having extensions
 * Can possibly also be useful for PoC development
 */
var ExperimentalExtensionsBase = /*#__PURE__*/(0, _createClass2["default"])(function ExperimentalExtensionsBase() {
  (0, _classCallCheck2["default"])(this, ExperimentalExtensionsBase);
});
exports.ExperimentalExtensionsBase = ExperimentalExtensionsBase;

var DefaultExperimentalExtensions = /*#__PURE__*/function (_ExperimentalExtensio) {
  (0, _inherits2["default"])(DefaultExperimentalExtensions, _ExperimentalExtensio);

  var _super = _createSuper(DefaultExperimentalExtensions);

  function DefaultExperimentalExtensions() {
    (0, _classCallCheck2["default"])(this, DefaultExperimentalExtensions);
    return _super.apply(this, arguments);
  }

  (0, _createClass2["default"])(DefaultExperimentalExtensions, [{
    key: "experimentalMethod",
    value: function experimentalMethod(args) {
      return null;
    }
  }]);
  return DefaultExperimentalExtensions;
}(ExperimentalExtensionsBase);

exports.DefaultExperimentalExtensions = DefaultExperimentalExtensions;