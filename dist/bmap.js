(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('echarts')) :
  typeof define === 'function' && define.amd ? define(['exports', 'echarts'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.bmap = {}, global.echarts));
})(this, (function (exports, echarts) { 'use strict';

  function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () { return e[k]; }
          });
        }
      });
    }
    n.default = e;
    return Object.freeze(n);
  }

  var echarts__namespace = /*#__PURE__*/_interopNamespaceDefault(echarts);

  /*
  * Licensed to the Apache Software Foundation (ASF) under one
  * or more contributor license agreements.  See the NOTICE file
  * distributed with this work for additional information
  * regarding copyright ownership.  The ASF licenses this file
  * to you under the Apache License, Version 2.0 (the
  * "License"); you may not use this file except in compliance
  * with the License.  You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing,
  * software distributed under the License is distributed on an
  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  * KIND, either express or implied.  See the License for the
  * specific language governing permissions and limitations
  * under the License.
  */
  // @ts-nocheck
  /* global BMap */
  function BMapCoordSys(bmap, api) {
      this._bmap = bmap;
      this.dimensions = ['lng', 'lat'];
      this._mapOffset = [0, 0];
      this._api = api;
      this._projection = new BMapGL.MercatorProjection();
  }
  BMapCoordSys.prototype.type = 'bmap';
  BMapCoordSys.prototype.dimensions = ['lng', 'lat'];
  BMapCoordSys.prototype.setZoom = function (zoom) {
      this._zoom = zoom;
  };
  BMapCoordSys.prototype.setCenter = function (center) {
      this._center = this._projection.lngLatToPoint(new BMapGL.Point(center[0], center[1]));
  };
  BMapCoordSys.prototype.setMapOffset = function (mapOffset) {
      this._mapOffset = mapOffset;
  };
  BMapCoordSys.prototype.getBMap = function () {
      return this._bmap;
  };
  BMapCoordSys.prototype.dataToPoint = function (data) {
      const point = new BMapGL.Point(data[0], data[1]);
      // TODO mercator projection is toooooooo slow
      // let mercatorPoint = this._projection.lngLatToPoint(point);
      // let width = this._api.getZr().getWidth();
      // let height = this._api.getZr().getHeight();
      // let divider = Math.pow(2, 18 - 10);
      // return [
      //     Math.round((mercatorPoint.x - this._center.x) / divider + width / 2),
      //     Math.round((this._center.y - mercatorPoint.y) / divider + height / 2)
      // ];
      const px = this._bmap.pointToOverlayPixel(point);
      const mapOffset = this._mapOffset;
      return [px.x - mapOffset[0], px.y - mapOffset[1]];
  };
  BMapCoordSys.prototype.pointToData = function (pt) {
      const mapOffset = this._mapOffset;
      pt = this._bmap.overlayPixelToPoint({
          x: pt[0] + mapOffset[0],
          y: pt[1] + mapOffset[1]
      });
      return [pt.lng, pt.lat];
  };
  BMapCoordSys.prototype.getViewRect = function () {
      const api = this._api;
      return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
  };
  BMapCoordSys.prototype.getRoamTransform = function () {
      return echarts.matrix.create();
  };
  BMapCoordSys.prototype.prepareCustoms = function () {
      const rect = this.getViewRect();
      return {
          coordSys: {
              // The name exposed to user is always 'cartesian2d' but not 'grid'.
              type: 'bmap',
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
          },
          api: {
              coord: echarts.util.bind(this.dataToPoint, this),
              size: echarts.util.bind(dataToCoordSize, this)
          }
      };
  };
  BMapCoordSys.prototype.convertToPixel = function (ecModel, finder, value) {
      // here we ignore finder as only one bmap component is allowed
      return this.dataToPoint(value);
  };
  BMapCoordSys.prototype.convertFromPixel = function (ecModel, finder, value) {
      return this.pointToData(value);
  };
  function dataToCoordSize(dataSize, dataItem) {
      dataItem = dataItem || [0, 0];
      return echarts.util.map([0, 1], function (dimIdx) {
          const val = dataItem[dimIdx];
          const halfSize = dataSize[dimIdx] / 2;
          const p1 = [];
          const p2 = [];
          p1[dimIdx] = val - halfSize;
          p2[dimIdx] = val + halfSize;
          p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
          return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
      }, this);
  }
  let Overlay;
  // For deciding which dimensions to use when creating list data
  BMapCoordSys.dimensions = BMapCoordSys.prototype.dimensions;
  function createOverlayCtor() {
      function Overlay(root) {
          this._root = root;
      }
      Overlay.prototype = new BMapGL.Overlay();
      /**
       * 初始化
       *
       * @param {BMapGL.Map} map
       * @override
       */
      Overlay.prototype.initialize = function (map) {
          map.getPanes().labelPane.appendChild(this._root);
          return this._root;
      };
      /**
       * @override
       */
      Overlay.prototype.draw = function () { };
      return Overlay;
  }
  BMapCoordSys.create = function (ecModel, api) {
      let bmapCoordSys;
      const root = api.getDom();
      // TODO Dispose
      ecModel.eachComponent('bmap', function (bmapModel) {
          const painter = api.getZr().painter;
          const viewportRoot = painter.getViewportRoot();
          if (typeof BMapGL === 'undefined') {
              throw new Error('BMapGL api is not loaded');
          }
          Overlay = Overlay || createOverlayCtor();
          if (bmapCoordSys) {
              throw new Error('Only one bmap component can exist');
          }
          let bmap;
          if (!bmapModel.__bmap) {
              // Not support IE8
              let bmapRoot = root.querySelector('.ec-extension-bmap');
              if (bmapRoot) {
                  // Reset viewport left and top, which will be changed
                  // in moving handler in BMapView
                  viewportRoot.style.left = '0px';
                  viewportRoot.style.top = '0px';
                  root.removeChild(bmapRoot);
              }
              bmapRoot = document.createElement('div');
              bmapRoot.className = 'ec-extension-bmap';
              // fix #13424
              bmapRoot.style.cssText = 'position:absolute;width:100%;height:100%';
              root.appendChild(bmapRoot);
              // initializes bmap
              let mapOptions = bmapModel.get('mapOptions');
              if (mapOptions) {
                  mapOptions = echarts.util.clone(mapOptions);
                  // Not support `mapType`, use `bmap.setMapType(MapType)` instead.
                  delete mapOptions.mapType;
              }
              bmap = bmapModel.__bmap = new BMapGL.Map(bmapRoot, mapOptions);
              const overlay = new Overlay(viewportRoot);
              bmap.addOverlay(overlay);
              // Override
              painter.getViewportRootOffset = function () {
                  return { offsetLeft: 0, offsetTop: 0 };
              };
          }
          bmap = bmapModel.__bmap;
          // Set bmap options
          // centerAndZoom before layout and render
          const center = bmapModel.get('center');
          const zoom = bmapModel.get('zoom');
          if (center && zoom) {
              const bmapCenter = bmap.getCenter();
              const bmapZoom = bmap.getZoom();
              const centerOrZoomChanged = bmapModel.centerOrZoomChanged([bmapCenter.lng, bmapCenter.lat], bmapZoom);
              if (centerOrZoomChanged) {
                  const pt = new BMapGL.Point(center[0], center[1]);
                  bmap.centerAndZoom(pt, zoom);
              }
          }
          bmapCoordSys = new BMapCoordSys(bmap, api);
          bmapCoordSys.setMapOffset(bmapModel.__mapOffset || [0, 0]);
          bmapCoordSys.setZoom(zoom);
          bmapCoordSys.setCenter(center);
          bmapModel.coordinateSystem = bmapCoordSys;
      });
      ecModel.eachSeries(function (seriesModel) {
          if (seriesModel.get('coordinateSystem') === 'bmap') {
              seriesModel.coordinateSystem = bmapCoordSys;
          }
      });
      // return created coordinate systems
      return bmapCoordSys && [bmapCoordSys];
  };

  /*
  * Licensed to the Apache Software Foundation (ASF) under one
  * or more contributor license agreements.  See the NOTICE file
  * distributed with this work for additional information
  * regarding copyright ownership.  The ASF licenses this file
  * to you under the Apache License, Version 2.0 (the
  * "License"); you may not use this file except in compliance
  * with the License.  You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing,
  * software distributed under the License is distributed on an
  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  * KIND, either express or implied.  See the License for the
  * specific language governing permissions and limitations
  * under the License.
  */
  // @ts-nocheck
  function v2Equal(a, b) {
      return a && b && a[0] === b[0] && a[1] === b[1];
  }
  echarts__namespace.extendComponentModel({
      type: 'bmap',
      getBMap: function () {
          // __bmap is injected when creating BMapCoordSys
          return this.__bmap;
      },
      setCenterAndZoom: function (center, zoom) {
          this.option.center = center;
          this.option.zoom = zoom;
      },
      centerOrZoomChanged: function (center, zoom) {
          const option = this.option;
          return !(v2Equal(center, option.center) && zoom === option.zoom);
      },
      defaultOption: {
          center: [104.114129, 37.550339],
          zoom: 5,
          // 2.0 https://lbsyun.baidu.com/custom/index.htm
          mapStyle: {},
          // 3.0 https://lbsyun.baidu.com/index.php?title=open/custom
          mapStyleV2: {},
          // See https://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a0b1
          mapOptions: {},
          roam: false
      }
  });

  /*
  * Licensed to the Apache Software Foundation (ASF) under one
  * or more contributor license agreements.  See the NOTICE file
  * distributed with this work for additional information
  * regarding copyright ownership.  The ASF licenses this file
  * to you under the Apache License, Version 2.0 (the
  * "License"); you may not use this file except in compliance
  * with the License.  You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing,
  * software distributed under the License is distributed on an
  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  * KIND, either express or implied.  See the License for the
  * specific language governing permissions and limitations
  * under the License.
  */
  // @ts-nocheck
  function isEmptyObject(obj) {
      for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
              return false;
          }
      }
      return true;
  }
  echarts__namespace.extendComponentView({
      type: 'bmap',
      render: function (bMapModel, ecModel, api) {
          let rendering = true;
          const bmap = bMapModel.getBMap();
          const viewportRoot = api.getZr().painter.getViewportRoot();
          const coordSys = bMapModel.coordinateSystem;
          const moveHandler = function (type, target) {
              if (rendering) {
                  return;
              }
              const offsetEl = viewportRoot.parentNode.parentNode.parentNode;
              const mapOffset = [
                  -parseInt(offsetEl.style.left, 10) || 0,
                  -parseInt(offsetEl.style.top, 10) || 0
              ];
              // only update style when map offset changed
              const viewportRootStyle = viewportRoot.style;
              const offsetLeft = mapOffset[0] + 'px';
              const offsetTop = mapOffset[1] + 'px';
              if (viewportRootStyle.left !== offsetLeft) {
                  viewportRootStyle.left = offsetLeft;
              }
              if (viewportRootStyle.top !== offsetTop) {
                  viewportRootStyle.top = offsetTop;
              }
              coordSys.setMapOffset(mapOffset);
              bMapModel.__mapOffset = mapOffset;
              api.dispatchAction({
                  type: 'bmapRoam',
                  animation: {
                      duration: 0
                  }
              });
          };
          function zoomEndHandler() {
              if (rendering) {
                  return;
              }
              api.dispatchAction({
                  type: 'bmapRoam',
                  animation: {
                      duration: 0
                  }
              });
          }
          bmap.removeEventListener('moving', this._oldMoveHandler);
          bmap.removeEventListener('moveend', this._oldMoveHandler);
          bmap.removeEventListener('zoomend', this._oldZoomEndHandler);
          bmap.addEventListener('moving', moveHandler);
          bmap.addEventListener('moveend', moveHandler);
          bmap.addEventListener('zoomend', zoomEndHandler);
          this._oldMoveHandler = moveHandler;
          this._oldZoomEndHandler = zoomEndHandler;
          const roam = bMapModel.get('roam');
          if (roam && roam !== 'scale') {
              bmap.enableDragging();
          }
          else {
              bmap.disableDragging();
          }
          if (roam && roam !== 'move') {
              bmap.enableScrollWheelZoom();
              bmap.enableDoubleClickZoom();
              bmap.enablePinchToZoom();
          }
          else {
              bmap.disableScrollWheelZoom();
              bmap.disableDoubleClickZoom();
              bmap.disablePinchToZoom();
          }
          /* map 2.0 */
          const originalStyle = bMapModel.__mapStyle;
          const newMapStyle = bMapModel.get('mapStyle') || {};
          // FIXME, Not use JSON methods
          const mapStyleStr = JSON.stringify(newMapStyle);
          if (JSON.stringify(originalStyle) !== mapStyleStr) {
              // FIXME May have blank tile when dragging if setMapStyle
              if (!isEmptyObject(newMapStyle)) {
                  bmap.setMapStyle(echarts__namespace.util.clone(newMapStyle));
              }
              bMapModel.__mapStyle = JSON.parse(mapStyleStr);
          }
          /* map 3.0 */
          const originalStyle2 = bMapModel.__mapStyle2;
          const newMapStyle2 = bMapModel.get('mapStyleV2') || {};
          // FIXME, Not use JSON methods
          const mapStyleStr2 = JSON.stringify(newMapStyle2);
          if (JSON.stringify(originalStyle2) !== mapStyleStr2) {
              // FIXME May have blank tile when dragging if setMapStyle
              if (!isEmptyObject(newMapStyle2)) {
                  bmap.setMapStyleV2(echarts__namespace.util.clone(newMapStyle2));
              }
              bMapModel.__mapStyle2 = JSON.parse(mapStyleStr2);
          }
          rendering = false;
      }
  });

  /*
  * Licensed to the Apache Software Foundation (ASF) under one
  * or more contributor license agreements.  See the NOTICE file
  * distributed with this work for additional information
  * regarding copyright ownership.  The ASF licenses this file
  * to you under the Apache License, Version 2.0 (the
  * "License"); you may not use this file except in compliance
  * with the License.  You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing,
  * software distributed under the License is distributed on an
  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  * KIND, either express or implied.  See the License for the
  * specific language governing permissions and limitations
  * under the License.
  */
  // @ts-nocheck
  /**
   * BMap component extension
   */
  echarts__namespace.registerCoordinateSystem('bmap', BMapCoordSys);
  // Action
  echarts__namespace.registerAction({
      type: 'bmapRoam',
      event: 'bmapRoam',
      update: 'updateLayout'
  }, function (payload, ecModel) {
      ecModel.eachComponent('bmap', function (bMapModel) {
          const bmap = bMapModel.getBMap();
          const center = bmap.getCenter();
          bMapModel.setCenterAndZoom([center.lng, center.lat], bmap.getZoom());
      });
  });
  const version = '1.0.0';

  exports.version = version;

}));
