// Select the destination before asynchronous export preparation consumes user activation.
export async function saveExport({name,type,extension,prepare,download,picker=globalThis.window?.showSaveFilePicker?.bind(globalThis.window)}){
  let handle;
  if(picker){
    try{handle=await picker({suggestedName:name,types:[{description:extension==='png'?'PNG image':'JSON file',accept:{[type]:['.'+extension]}}]});}
    catch(error){if(error?.name==='AbortError')return 'cancelled';throw error;}
  }
  const blob=await prepare();
  if(!(blob instanceof Blob)||!blob.size)throw new Error('Nothing was generated to download');
  if(!handle){download(blob,name);return 'downloaded';}
  const writable=await handle.createWritable();
  try{await writable.write(blob);await writable.close();}
  catch(error){try{await writable.abort();}catch{}throw error;}
  return 'saved';
}
