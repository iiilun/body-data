import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/src/renderer.js';
import {framePose} from '../dist/src/controls.js';

const c={width:1280,height:720,footerHeight:200,g:{block:40},cards:[],hands:[],pose:framePose('space'),elapsed:0,progress:.2,dt:0};
test('elastic housing typography lays out to the bottom of the viewport',()=>{
 let bounds;const field={items:[],build(...args){bounds=args;},update(){}},renderer={ctx:{measureText:()=>({width:12}),fillText(){}},field,placed:[],type(){},body(){}};
 Renderer.prototype.space.call(renderer,c);assert.equal(bounds[0],1280);assert.equal(bounds[1],720);
});
test('glass interaction uses the whole display and no longer reserves a counter strip',()=>{
 let bounds,paintHeight;const renderer={ctx:{},glassHands:()=>[],glass:{update(_dt,_hands,options){bounds=options;}},glassView:{draw(_ctx,context){paintHeight=context.height;}}};
 Renderer.prototype.thirst.call(renderer,c);assert.deepEqual(bounds,{width:1280,height:720});assert.equal(paintHeight,720);
});
test('heat data distortion reaches the complete display height',()=>{
 let height;const renderer={ctx:{createLinearGradient:()=>({addColorStop(){}}),fillRect(){}},project:p=>p,placed:[],melt:{cooling:0,update:()=>new Map()},haze:{draw(_ctx,options){height=options.height;}}};
 Renderer.prototype.shelter.call(renderer,c);assert.equal(height,720);
});
test('the vacancy grid receives full-height layout without a footer reservation',()=>{
 let args;const renderer={ctx:{fillRect(){},strokeRect(){}},project:p=>p,flowFacts(){},body(){},placed:[],city:{build(...values){args=values;},tiles:[],update(){}}};
 Renderer.prototype.vacant.call(renderer,{...c,lang:'en'});assert.deepEqual(args,[1280,720,13.8]);
});
