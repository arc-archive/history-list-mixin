[![Published on NPM](https://img.shields.io/npm/v/@advanced-rest-client/history-list-mixin.svg)](https://www.npmjs.com/package/@advanced-rest-client/history-list-mixin)

[![Build Status](https://travis-ci.org/advanced-rest-client/history-list-mixin.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/history-list-mixin)

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/advanced-rest-client/history-list-mixin)

# history-list-mixin

A mixin to be applied to a list that renders history requests.

### API components

This components is a part of [API components ecosystem](https://elements.advancedrestclient.com/)

## Usage

### Installation
```
npm install --save @advanced-rest-client/history-list-mixin
```

### In a Polymer 3 element

```js
import {PolymerElement, html} from '@polymer/polymer';
import {HistoryListMixin} from '@advanced-rest-client/history-list-mixin/history-list-mixin.js';

class SampleElement extends HistoryListMixin(PolymerElement) {
}
customElements.define('sample-element', SampleElement);
```

### Installation

```sh
git clone https://github.com/advanced-rest-client/history-list-mixin
cd api-url-editor
npm install
npm install -g polymer-cli
```

### Running the demo locally

```sh
polymer serve --npm
open http://127.0.0.1:<port>/demo/
```

### Running the tests
```sh
polymer test --npm
```
