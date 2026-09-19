// Small DOM test double for Filter Library event/state tests; layout is tested in-browser.
export function installBrowserDom(){
  let doc;
  class Node{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.listeners={};this._text='';this._value=undefined;this.disabled=false;this.hidden=false;this.checked=false;this.open=false;}
    get isConnected(){return this===doc.body||Boolean(this.parentNode?.isConnected);}
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    set textContent(value){this.replaceChildren();this._text=String(value);}
    get value(){return this._value??(this.tagName==='SELECT'?this.options[0]?.value:'')??'';}
    set value(value){this._value=String(value);}
    get options(){return this.querySelectorAll('option');}
    get className(){return this.attributes.class||'';}
    set className(value){this.attributes.class=value;}
    setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);if(['value','id','type'].includes(name))this[name]=String(value);if(['disabled','hidden','checked'].includes(name))this[name]=true;}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
    append(...children){for(let child of children){if(typeof child==='string'){const text=new Node('#text');text.textContent=child;child=text;}child.remove();child.parentNode=this;this.children.push(child);}}
    replaceChildren(...children){for(const child of this.children){child.parentNode=null;if(child===doc?.activeElement||child.contains(doc?.activeElement))doc.activeElement=doc.body;}this.children=[];this._text='';this.append(...children);}
    remove(){if(this.parentNode){const parent=this.parentNode;parent.children=parent.children.filter(child=>child!==this);this.parentNode=null;}}
    contains(node){return node===this||this.children.some(child=>child.contains(node));}
    matches(selector){
      const tag=selector.match(/^[\w-]+/)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;
      for(const name of selector.matchAll(/\.([\w-]+)/g))if(!this.className.split(' ').includes(name[1]))return false;
      for(const [,name,value] of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)){
        const actual=name.startsWith('data-')?this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]:this.getAttribute(name);
        if(actual===undefined||actual===null||(value!==undefined&&actual!==value))return false;
      }
      return true;
    }
    querySelectorAll(selector){
      const parts=selector.split(/\s+(?![^\[]*\])/),result=[];
      const visit=node=>{for(const child of node.children){if(child.matches(parts.at(-1))){let ancestor=child.parentNode,index=parts.length-2;while(index>=0&&ancestor){if(ancestor.matches(parts[index]))index--;ancestor=ancestor.parentNode;}if(index<0)result.push(child);}visit(child);}};visit(this);return result;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
    closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)??null;}
    addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
    dispatchEvent(event){event.target??=this;this[`on${event.type}`]?.(event);for(const handler of this.listeners[event.type]??[])handler(event);if(event.bubbles)this.parentNode?.dispatchEvent(event);return true;}
    click(){if(!this.disabled)return this.onclick?.({target:this});}
    focus(){if(!this.disabled){doc.activeElement=this;this.dispatchEvent({type:'focusin',bubbles:true});}}
    showModal(){this.open=true;}
    close(value){this.open=false;this.returnValue=value;this.dispatchEvent({type:'close'});}
    set innerHTML(html){
      this.replaceChildren();const stack=[this],voids=new Set(['input','img','br']);
      for(const token of html.matchAll(/<\/([\w-]+)>|<([\w-]+)([^>]*)>|([^<]+)/g)){
        if(token[1]){stack.pop();continue;}
        if(token[2]){const node=new Node(token[2]);for(const [,name,value] of token[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(name,value??'');stack.at(-1).append(node);if(!voids.has(token[2]))stack.push(node);}
        else{const text=new Node('#text');text.textContent=token[4];stack.at(-1).append(text);}
      }
    }
  }
  doc={createElement:tag=>new Node(tag),createTextNode:text=>{const node=new Node('#text');node.textContent=text;return node;}};doc.body=new Node('body');doc.activeElement=doc.body;
  const previous={document:globalThis.document,CSS:globalThis.CSS,IntersectionObserver:globalThis.IntersectionObserver};
  globalThis.document=doc;globalThis.CSS={escape:value=>value};
  const observers=[];globalThis.IntersectionObserver=class{constructor(callback,options){this.callback=callback;this.options=options;this.rows=[];observers.push(this);}observe(row){this.rows.push(row);}unobserve(){}disconnect(){this.disconnected=true;}show(rows=this.rows){this.callback(rows.map(target=>({target,isIntersecting:true})));}};
  return{document:doc,observers,restore:()=>Object.assign(globalThis,previous)};
}
