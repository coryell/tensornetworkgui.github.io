// Copyright 2019 The TensorNetwork Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

Vue.component(
    'workspace',
	{
        props: {
            state: Object
        },
        data: function() {
			return {
				width: 900,
				height: 600,
                dragSelector: {
				    dragging: false,
				    startX: null,
                    startY: null,
                    endX: null,
                    endY: null
                },
                protoEdge: {
                    x: null,
                    y: null,
                    node: null,
                    axis: null,
                }
			};
		},
        methods: {
            onMouseDown: function(event) {
                if (this.state.selectedNodes.length > 0) {
                    this.state.selectedNodes = [];
                }

                document.addEventListener('mousemove', this.onMouseMove);
                document.addEventListener('mouseup', this.onMouseUp);

                let workspace = document.getElementById('workspace').getBoundingClientRect();

                this.dragSelector.dragging = true;
                this.dragSelector.startX = event.clientX - workspace.left;
                this.dragSelector.startY = event.clientY - workspace.top;
                this.dragSelector.endX = event.clientX - workspace.left;
                this.dragSelector.endY = event.clientY - workspace.top;
            },
            onMouseMove: function(event) {
                let workspace = document.getElementById('workspace').getBoundingClientRect();

                this.dragSelector.endX = event.clientX - workspace.left;
                this.dragSelector.endY = event.clientY - workspace.top;
            },
            onMouseUp: function() {
                document.removeEventListener('mousemove', this.onMouseMove);
                document.removeEventListener('mouseup', this.onMouseUp);

                this.dragSelector.dragging = false;

                let x1 = this.dragSelector.startX;
                let x2 = this.dragSelector.endX;
                let y1 = this.dragSelector.startY;
                let y2 = this.dragSelector.endY;

                if (this.state.selectedNodes.length > 0) {
                    this.state.selectedNodes = [];
                }
                let selected = this.state.selectedNodes;
                this.state.nodes.forEach(function(node) {
                    let x = node.position.x;
                    let y = node.position.y;
                    if ((x1 <= x && x <= x2) || (x2 <= x && x <= x1)) {
                        if ((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) {
                            selected.push(node);
                        }
                    }
                });
                if (selected.length > 0) {
                    selected.sort(function (node1, node2) {
                        let distance1 = (node1.position.x - x1) ** 2 + (node1.position.y - y1) ** 2;
                        let distance2 = (node2.position.x - x1) ** 2 + (node2.position.y - y1) ** 2;
                        return distance1 - distance2;
                    })
                }
            },
            onAxisMouseDown: function(node, axis) {
                if (this.axisOccupied(node, axis)) {
                    return;
                }
                document.addEventListener('mousemove', this.dragAxis);
                document.addEventListener('mouseup', this.releaseAxisDrag);
                this.protoEdge.node = node;
                this.protoEdge.axis = axis;
            },
            dragAxis: function(event) {
                let workspace = document.getElementById('workspace').getBoundingClientRect();
                this.state.draggingProtoEdge = true;
                this.protoEdge.x = event.clientX - workspace.left;
                this.protoEdge.y = event.clientY - workspace.top;
            },
            releaseAxisDrag: function() {
                document.removeEventListener('mousemove', this.dragAxis);
                document.removeEventListener('mouseup', this.releaseAxisDrag);
                this.state.draggingProtoEdge = false;
                this.protoEdge.node = null;
                this.protoEdge.axis = null;
            },
            onAxisMouseUp: function(node, axis) {
		        if (this.state.draggingProtoEdge) {
                    if (this.axisOccupied(node, axis)) {
                        return;
                    }
                    if (this.protoEdge.node.name === node.name
                        && this.protoEdge.axis === axis) {
                        return; // don't allow connection of an axis to itself
                    }
                    this.state.edges.push([
                        [this.protoEdge.node.name, this.protoEdge.axis],
                        [node.name, axis],
                        null
                    ])
                }
            },
            axisOccupied: function(node, axis) {
                for (let i = 0; i < this.state.edges.length; i++) {
                    let edge = this.state.edges[i];
                    if ((node.name === edge[0][0] && axis === edge[0][1])
                        || (node.name === edge[1][0] && axis === edge[1][1])) {
                        return true;
                    }
                }
                return false;
            }
        },
		template: `
			<svg class="workspace" id="workspace" xmlns="http://www.w3.org/2000/svg"
			    :width="width" :height="height" @mousedown="onMouseDown">
                <text id="saved-state" display="none"></text>
                <proto-edge v-if="state.draggingProtoEdge" :x="protoEdge.x" :y="protoEdge.y"
				    :node="protoEdge.node" :axis="protoEdge.axis" />
				<edge v-for="edge in state.edges" :edge="edge" :state="state" /> 
				<node v-for="node in state.nodes" :node="node" :state="state"
				    @axismousedown="onAxisMouseDown(node, ...arguments)"
				    @axismouseup="onAxisMouseUp(node, ...arguments)" />
				<drag-selector v-if="dragSelector.dragging" :startX="dragSelector.startX" :startY="dragSelector.startY"
				    :endX="dragSelector.endX" :endY="dragSelector.endY" />
			</svg>
		`
	}
);

Vue.component(
    'grid',
    {
        mixins: [mixinGeometry],
        props: {
            state: Object
        },
        data: function() {
            return {
                width: 900,
                height: 600,
            }
        },
        computed: {
            points: function() {
                let points = [];
                for (let x = this.gridSpacing; x < 900; x += this.gridSpacing) {
                    for (let y = this.gridSpacing; y < 600; y += this.gridSpacing) {
                        points.push({x: x, y: y});
                    }
                }
                return points;
            }
        },
        template: `
			<svg class="grid" id="grid" xmlns="http://www.w3.org/2000/svg"
			    :width="width" :height="height">
			    <circle v-if="state.snapToGrid" v-for="point in points" :cx="point.x" :cy="point.y" r="1" stroke="none"
			        fill="#ddd" />
			</svg>
		`
    }
);

Vue.component(
    'drag-selector',
    {
        props: {
            startX: Number,
            startY: Number,
            endX: Number,
            endY: Number,
        },
        computed: {
            x: function() {
                return Math.min(this.startX, this.endX);
            },
            y: function() {
                return Math.min(this.startY, this.endY);
            },
            width: function() {
                return Math.abs(this.startX - this.endX);
            },
            height: function() {
                return Math.abs(this.startY - this.endY);
            }
        },
        template: `
            <rect class="drag-selector" :x="x" :y="y" :width="width" :height="height" />
        `
    }
);
