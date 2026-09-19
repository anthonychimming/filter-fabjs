import assert from 'node:assert/strict';
import { validateOnlineLibraryManifest as validate, ONLINE_LIBRARY_MAX_ENTRIES, ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH, ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH } from '../src/io/filter-library-manifest.js';
import { catalogEntry, onlineCatalogEntry, searchCatalog, readEntryPreference, writeEntryPreference, PREFERENCE_PREFIX } from '../src/app/filter-catalog.js';

const filter={id:'chromatic-ripple',revision:1,name:'Chromatic Ripple',author:'André',description:'Radial displacement',tags:['Distortion','Colour'],documentType:'filter',filterFormat:2,publishedAt:'2026-09-18',preview:{url:'previews/example-r1.webp',width:512,height:512},package:{url:'filters/example-r1.png'}};
const manifest={schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:7,generatedAt:'2026-09-18T00:00:00Z',filters:[filter]};
const validateFilter=changes=>validate({...manifest,filters:[{...filter,...changes}]}).filters[0];
const input=structuredClone(manifest);
input.filters[0].name='  Chromatic Ripple  ';input.filters[0].author=' André ';input.filters[0].description=' Radial displacement ';
input.filters[0].tags=[' Distortion ','distortion','Re\u0301tro','Rétro','two   words'];
input.filters[0].preview.url=' previews/example-r1.webp ';input.filters[0].package.url=' filters/example-r1.png ';
input.unknown={ignored:true};input.filters[0].formulas=['invalid formula'];input.filters[0].controls=[999];input.filters[0].preview.extra='ignored';
const before=structuredClone(input),normalized=validate(input);
assert.deepEqual(input,before);
assert.deepEqual(normalized,{...manifest,filters:[{...filter,tags:['Distortion','Rétro','two words']}]});
assert.notEqual(normalized,input);assert.notEqual(normalized.filters,input.filters);
for(const key of ['tags','preview','package'])assert.notEqual(normalized.filters[0][key],input.filters[0][key]);
const defaults=validateFilter({author:undefined,description:undefined,tags:undefined,publishedAt:undefined});
assert.equal(defaults.author,'');assert.equal(defaults.description,'');assert.deepEqual(defaults.tags,[]);assert.equal('publishedAt' in defaults,false);
assert.equal('generatedAt' in validate({...manifest,generatedAt:undefined}),false);
assert.deepEqual(validate({...manifest,filters:[]}).filters,[]);
assert.equal(validate({...manifest,libraryVersion:Number.MAX_SAFE_INTEGER}).libraryVersion,Number.MAX_SAFE_INTEGER);
assert.equal(validate({...manifest,filters:Array.from({length:ONLINE_LIBRARY_MAX_ENTRIES},(_,i)=>({...filter,id:`filter-${i}`}))}).filters.length,1000);
assert.equal(validateFilter({id:'a'.repeat(80),revision:Number.MAX_SAFE_INTEGER,name:'n'.repeat(120),author:'a'.repeat(120),description:'d'.repeat(2000),tags:Array.from({length:20},(_,i)=>`${i}`)}).name.length,120);
assert.equal(validateFilter({tags:['😀'.repeat(32)]}).tags[0].length,64);
for(const date of ['2024-02-29','2000-02-29','0001-01-01'])assert.equal(validateFilter({publishedAt:date}).publishedAt,date);

// Schema, collection bounds and entry fields fail closed without coercion.
for(const value of [null,[],false,'manifest'])assert.throws(()=>validate(value),/manifest must be an object/);
for(const [field,values,pattern] of [
  ['schema',[undefined,null,'wrong'],/schema is invalid/],
  ['schemaVersion',[undefined,0,2,'1'],/schema version/],
  ['libraryVersion',[undefined,null,0,-1,1.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER+1],/libraryVersion/],
  ['filters',[undefined,null,{},Array(1001).fill(filter)],/filters must be an array/],
  ['generatedAt',[null,5,'','  ','not a date','2026-09-18'+' '.repeat(ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH)],/generatedAt/]
])for(const value of values)assert.throws(()=>validate({...manifest,[field]:value}),pattern,`${field}: ${value}`);
for(const entry of [null,[],5])assert.throws(()=>validate({...manifest,filters:[entry]}),/filter must be an object/);
assert.throws(()=>validate({...manifest,filters:Array(1)}),/filter must be an object/);
assert.throws(()=>validate({...manifest,filters:[filter,{...filter,name:'Renamed'}]}),/duplicate filter ID "chromatic-ripple"/);
for(const [field,values,pattern] of [
  ['id',[undefined,null,'','online:foo','a b','a'.repeat(81),12],/id/i],
  ['revision',[undefined,null,0,-1,1.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER+1],/revision/],
  ['name',[undefined,null,42,'','  ','n'.repeat(121)],/name/],
  ['author',[null,42,'a'.repeat(121)],/author/],
  ['description',[null,42,'d'.repeat(2001)],/description/],
  ['tags',[null,{},[''],['a\n'],['\u200b'],['a'.repeat(33)],[42],Array(21).fill('a')],/tag/i],
  ['documentType',[undefined,null,'graph','Filter'],/document type/],
  ['filterFormat',[undefined,null,1,3,'2'],/filter format/],
  ['publishedAt',[null,42,'2026-9-18','2026-09-18T00:00:00Z','2026-02-29','1900-02-29','2026-04-31','2026-00-01','2026-13-01','2026-01-00',' 2026-09-18'],/publishedAt/],
  ['preview',[undefined,null,[],42],/preview must be an object/],
  ['package',[undefined,null,[],42],/package must be an object/]
])for(const value of values)assert.throws(()=>validateFilter({[field]:value}),pattern,`${field}: ${value}`);

// Paths remain relative and unchanged except outer whitespace; descriptors are separate.
const badPaths=[undefined,null,42,'','  ','https://example.com/filter.png','http://example.com/filter.png','//example.com/filter.png','/filters/filter.png','../filter.png','filters/../private/filter.png','./filter.png','filters/./filter.png','filters\\filter.png','filters/filter.png?q=1','filters/filter.png#x','data:image/png;base64,x.png','javascript:filter.png','filters/fi\nlter.png','\tfilters/filter.png','filters/\u007ffilter.png','filters/%2e%2e/private.png','filters/.%2E/private.png','%2f%2fexample.com/filter.png','filters/%5cfilter.png','filters/%00filter.png','filters/%zz.png','x'.repeat(ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH)+'.png'];
for(const label of ['preview','package'])for(const url of badPaths)assert.throws(()=>validateFilter({[label]:{...filter[label],url}}),/path must be a relative/,`${label}: ${url}`);
for(const url of ['filters/example-r1.png','filters/example-r1.PNG'])assert.equal(validateFilter({package:{url}}).package.url,url);
for(const url of ['filters/example-r1.png','previews/example-r1.webp','previews/example-r1.WEBP'])assert.equal(validateFilter({preview:{...filter.preview,url}}).preview.url,url);
assert.throws(()=>validateFilter({package:{url:'filters/example.webp'}}),/relative PNG asset/);
assert.throws(()=>validateFilter({preview:{...filter.preview,url:'previews/example.jpg'}}),/relative PNG or WebP asset/);
for(const dimension of ['width','height']){
  for(const value of [undefined,null,0,-1,1.5,2049,NaN,Infinity,'512'])assert.throws(()=>validateFilter({preview:{...filter.preview,[dimension]:value}}),new RegExp(`preview ${dimension}`));
  for(const value of [1,2048])assert.equal(validateFilter({preview:{...filter.preview,[dimension]:value}}).preview[dimension],value);
}

// Online projection accepts normalized metadata, without a native filter payload.
const metadata=validate(manifest).filters[0],preference={favorite:true,tags:['Personal']};
const online=onlineCatalogEntry(metadata,preference);
assert.deepEqual(online,{
  key:'online:chromatic-ripple',source:'online',name:filter.name,description:filter.description,author:filter.author,tags:filter.tags,favorite:true,document:null,unavailable:false,
  remote:{id:filter.id,revision:1,documentType:'filter',filterFormat:2,publishedAt:filter.publishedAt,preview:filter.preview,package:filter.package},
  index:['chromatic ripple','radial displacement','andre','distortion','colour']
});
assert.equal('formulas' in online,false);assert.equal('controls' in online,false);
assert.equal('publishedAt' in onlineCatalogEntry(defaults,preference).remote,false);
assert.equal(onlineCatalogEntry({...metadata,name:'Renamed',revision:2},preference).key,online.key);
const detached=onlineCatalogEntry(metadata,preference);
detached.tags.push('New');detached.remote.preview.url='changed';detached.remote.package.url='changed';
assert.deepEqual(metadata,filter);

const localDocument={id:filter.id,name:'Alpha',description:'Radial displacement',author:'André',tags:['Local'],formulas:['r','g','b','a']};
const builtin=catalogEntry(localDocument,'builtin',{favorite:false,tags:['Personal']});
const custom=catalogEntry({...localDocument,name:'Zulu'},'custom',{favorite:true,tags:[]});
const entries=[custom,online,builtin],keys=(options={},list=entries)=>searchCatalog(list,options).results.map(entry=>entry.key);
assert.deepEqual(keys(),[builtin.key,online.key,custom.key]);
assert.deepEqual(keys({source:'all'}),keys());
assert.deepEqual(keys({source:'local'}),[builtin.key,custom.key]);
for(const entry of entries)assert.deepEqual(keys({source:entry.source}),[entry.key]);
assert.deepEqual(keys({source:'unknown'}),[]);
for(const query of ['chromatic','radial','ANDRE','distortion',' chromatic  COLOUR '])assert.deepEqual(keys({source:'online',query}),[online.key]);
assert.deepEqual(keys({tags:['colour','distortion']}),[online.key]);
assert.deepEqual(keys({favorites:true}),[online.key,custom.key]);
assert.deepEqual(keys({source:'local',favorites:true}),[custom.key]);
assert.deepEqual(searchCatalog(entries,{source:'online',query:'missing'}).choices,[['colour','Colour'],['distortion','Distortion']]);
assert.equal(keys({query:'chromatic ripple',sort:'relevance'})[0],online.key);
const ranked=[onlineCatalogEntry({...metadata,id:'other',name:'Other',description:'Chromatic Ripple'},preference),onlineCatalogEntry({...metadata,id:'prefix',name:'Chromatic Ripple Plus'},preference),online];
assert.deepEqual(keys({query:'chromatic ripple',sort:'relevance'},ranked),[online.key,'online:prefix','online:other']);
const ties=[onlineCatalogEntry({...metadata,id:'z'},preference),onlineCatalogEntry({...metadata,id:'a'},preference),catalogEntry({...localDocument,name:metadata.name},'builtin',{favorite:false,tags:[]})];
for(const sort of ['az','relevance']){
  const expected=[builtin.key,'online:a','online:z'];
  assert.deepEqual(keys({query:'chromatic ripple',sort},ties),expected);
  assert.deepEqual(keys({query:'chromatic ripple',sort},[...ties].reverse()),expected);
}

// The existing storage namespace and corruption policy apply unchanged.
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
assert.deepEqual(readEntryPreference(storage,online.key),{version:1,favorite:false,tags:[]});
writeEntryPreference(storage,online.key,{favorite:true,tags:['Personal']});
assert.ok(data.has('ffw-entry-v1:online:chromatic-ripple'));
const stored=readEntryPreference(storage,online.key);
assert.equal(onlineCatalogEntry(metadata,stored).favorite,true);
assert.deepEqual(onlineCatalogEntry(metadata,stored).tags,filter.tags);
assert.deepEqual(metadata,filter);assert.equal(data.size,1);assert.equal(data.has('ffw-custom-presets'),false);
writeEntryPreference(storage,online.key,{favorite:false});assert.equal(readEntryPreference(storage,online.key).favorite,false);
for(const raw of ['bad json',JSON.stringify({version:2,favorite:true}),JSON.stringify({version:1,favorite:'yes'}),JSON.stringify({version:1,favorite:true,tags:['\u200b']})]){
  data.set(PREFERENCE_PREFIX+online.key,raw);
  assert.throws(()=>readEntryPreference(storage,online.key));assert.throws(()=>writeEntryPreference(storage,online.key,{favorite:true}));
  assert.equal(data.get(PREFERENCE_PREFIX+online.key),raw);
}
console.log('Online manifest validation, metadata-only catalog, source scopes, search and preference checks passed.');
