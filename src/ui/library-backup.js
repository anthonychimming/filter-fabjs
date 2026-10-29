// Presentation only. Storage, validation, planning and downloads belong to the app.
export function installLibraryBackupUI({dialog,onExportBackup,onImportBackup}){
  function node(tag,text){const element=document.createElement(tag);if(text)element.textContent=text;return element;}
  function button(text,action){const element=node('button',text);element.type='button';element.onclick=action;return element;}
  const wrapper=node('div');wrapper.className='library-manage';
  const trigger=button('Manage ⋯',()=>setMenu(menu.hidden));trigger.setAttribute('aria-label','Manage My Filters');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','libraryManageMenu');
  const menu=node('div');menu.id='libraryManageMenu';menu.className='library-manage-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','My Filters');
  const heading=node('strong','My Filters');heading.setAttribute('role','presentation');menu.append(heading);
  const status=node('p');status.className='library-backup-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');dialog.querySelector('.browser-tools').append(status);
  let busy=false,child=null,generation=0;
  function setMenu(open,restore=true){menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('button').focus();else if(restore)trigger.focus({preventScroll:true});}
  function report(error){status.setAttribute('role','alert');status.textContent=`${error.message||'Backup operation failed.'} No filters were changed.`;}
  function surface(title){
    const modal=node('dialog');modal.className='filter-choice library-backup-dialog';modal.setAttribute('aria-labelledby','libraryBackupTitle');const body=node('div');body.className='modal-body';const titleNode=node('h2',title);titleNode.id='libraryBackupTitle';body.append(titleNode);modal.append(body);document.body.append(modal);child=modal;
    const actions=node('div');actions.className='filter-actions';
    const close=()=>modal.close();actions.append(button('Cancel',close));
    modal.addEventListener('close',()=>{modal.remove();child=null;busy=false;if(dialog.open)trigger.focus({preventScroll:true});},{once:true});
    modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
    return{modal,body,actions,close};
  }
  async function exportBackup(){
    if(busy)return;busy=true;const operation=generation;setMenu(false);status.textContent='';
    try{
      const prepared=await onExportBackup();if(operation!==generation||!dialog.open)return;const {modal,body,actions,close}=surface('Export My Filters backup');
      body.append(node('p',`${prepared.count} saved My Filters. Includes all saved filters, controls, authoring metadata, timestamps and My Filters favorites.`),node('p','Excludes built-in and Online favorites, images, thumbnails, unsaved drafts and Explore snapshots.'));
      if(prepared.count){const download=button('Download backup',async()=>{download.disabled=true;feedback.textContent='';try{const result=await prepared.download();if(result!=='cancelled'){status.setAttribute('role','status');status.textContent=result==='saved'?'Backup saved.':'Backup download started.';close();}}catch(error){feedback.textContent=`Backup export failed: ${error.message||'Could not save the file'}`;}finally{download.disabled=false;}});download.className='primary';actions.append(download);}else body.append(node('p','There are no saved My Filters to back up.'));
      const feedback=node('p');feedback.setAttribute('role','alert');body.append(feedback,actions);modal.showModal();
    }catch(error){if(operation!==generation)return;busy=false;report(error);}
  }
  const picker=node('input');picker.type='file';picker.accept='.json,application/json';picker.hidden=true;picker.setAttribute('aria-label','Choose My Filters backup');wrapper.append(picker);
  picker.onchange=async()=>{
    const file=picker.files?.[0];picker.value='';if(!file||busy)return;busy=true;const operation=generation;status.textContent='';
    try{
      const review=await onImportBackup(file);if(operation!==generation||!dialog.open)return;const {modal,body,actions,close}=surface('Review My Filters import');
      body.append(node('p',file.name),node('p','Merge into My Filters. Existing filters are kept. Nothing is changed until you confirm.'));
      const summary=node('p');summary.setAttribute('role','status');body.append(summary);
      const options=node('fieldset');options.append(node('legend','Same-ID conflicts'));
      let policy='keep-both',plan;
      for(const [value,text] of [['keep-both','Keep both (recommended)'],['skip','Skip conflicts']]){const label=node('label'),radio=node('input');radio.type='radio';radio.name='libraryBackupConflict';radio.value=value;radio.checked=value===policy;radio.onchange=()=>{policy=value;update();};label.append(radio,document.createTextNode(text));options.append(label);}
      const feedback=node('p');feedback.setAttribute('role','alert');
      const confirm=button('',()=>{
        try{const result=review.commit(plan);status.setAttribute('role','status');status.textContent=`${result.added} filters added · ${result.identical} identical skipped · ${result.copies} conflicts kept as copies.`;close();}
        catch(error){feedback.textContent=error.message;confirm.disabled=true;}
      });confirm.className='primary';actions.append(confirm);
      function update(){try{plan=review.plan(policy);const c=plan.counts;summary.textContent=`${c.new} new · ${c.identical} identical/skipped · ${c.conflicts} same-ID conflicts · ${c.added} to add.`;confirm.textContent=`Import ${c.added} filters`;confirm.disabled=c.added===0;feedback.textContent=c.added?'':'Nothing to add. These filters are already present or conflicts are skipped.';}catch(error){confirm.disabled=true;feedback.textContent=error.message;}}
      body.append(options,feedback,actions);update();modal.showModal();
    }catch(error){if(operation!==generation)return;busy=false;report(error);trigger.focus({preventScroll:true});}
  };
  for(const [text,action] of [['Export backup',exportBackup],['Import backup',()=>{setMenu(false);picker.click();}]]){const item=button(text,action);item.setAttribute('role','menuitem');menu.append(item);}
  wrapper.append(trigger,menu);dialog.querySelector('.library-head').append(wrapper);
  // Keep Close last and available at narrow widths.
  dialog.querySelector('.library-head').append(dialog.querySelector('[data-close]'));
  wrapper.addEventListener('keydown',event=>{
    if(menu.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setMenu(false);}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const items=[...menu.querySelectorAll('button')],index=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus();}
    if(event.key==='Tab')setMenu(false,false);
  });
  dialog.addEventListener('click',event=>{if(!wrapper.contains(event.target))setMenu(false,false);});
  dialog.addEventListener('close',()=>{generation++;busy=false;setMenu(false,false);child?.close();});
}
