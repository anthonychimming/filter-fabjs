import { createFilterFabPngEnvelope, embedFilterFabMetadata } from '../../src/io/png-metadata.js';

export const packageFixtureDocument={format:'filter-fab-js',version:2,id:'fixture-online-a',name:'Online A',author:'Fixture Author',description:'Controlled package',tags:['Colour','Warm'],mathMode:'float',formulas:['255-r','g','b','a'],controls:[]};
export function packageFixtureMetadata(document=packageFixtureDocument){return{id:document.id,revision:1,name:document.name,author:document.author,description:document.description,tags:document.tags,documentType:'filter',filterFormat:2,preview:{url:'sample.png',width:1,height:1},package:{url:`${document.id}.png`}};}
export function packageFixturePng(){return new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPQCKj4DwADhAHwaWoWWwAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0))],{type:'image/png'});}
export async function packageFixtureBytes(document=packageFixtureDocument){return new Uint8Array(await(await embedFilterFabMetadata(packageFixturePng(),createFilterFabPngEnvelope(document,'2.8.7'))).arrayBuffer());}
