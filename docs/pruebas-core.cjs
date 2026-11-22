const assert = require('node:assert/strict');
const core = require('../js/main.js');
let passed = 0;
function test(name, run) { run(); console.log('PASS ' + name); passed++; }
test('Estado vacío válido y sin datos inventados', () => {
 const s=core.freshState(); assert.equal(core.validateState(s),true); assert.equal(s.profile,null); assert.equal(s.location,null);
});
test('Ejemplos válidos y consentimiento desactivado', () => {
 const s=core.exampleState(); assert(core.validateState(s)); assert.equal(s.profile.consent,false);
});
test('Datos corruptos y enums no válidos rechazados', () => {
 for (const mutate of [s=>s.profile.conditions=null,s=>s.sos={},s=>s.examples[0].care='invalid',s=>s.examples[0].receipt=null,s=>s.location.lat=Infinity,s=>s.voicePhrase='',s=>s.examples[0].profile.consent=false,s=>s.profile.name='<'.repeat(81)]) {
  const s=core.exampleState(); mutate(s); assert.equal(core.validateState(s),false);
 }
 for(const s of [null, [], 42, {}, {version:3}]) assert.equal(core.validateState(s),false);
});
test('SOS básico no incluye datos médicos ni confirmación automática', () => {
 const s=core.exampleState(); core.activate(s,false); assert.equal(s.sos.profile,null); assert.equal(s.sos.phase,'emitting'); assert.equal(s.sos.receipt,null); assert(core.validateState(s));
});
test('SOS consentido captura perfil independiente', () => {
 const s=core.exampleState(); s.profile.consent=true; core.activate(s,false); s.profile.name='Cambio posterior'; assert.notEqual(s.sos.profile.name,s.profile.name);
});
test('Reintento conserva paquete de emergencia original', () => {
 const s=core.exampleState(); s.profile.consent=true; core.activate(s,true); const packet=JSON.stringify([s.sos.profile,s.sos.location]);
 const p=structuredClone(s.profile); p.name='Cambio durante fallo'; core.saveProfile(s,p); s.location=null; core.activate(s,false);
 assert.equal(JSON.stringify([s.sos.profile,s.sos.location]),packet); assert.equal(s.sos.phase,'emitting');
});
test('Revocación elimina datos de paquete fallido y del reintento', () => {
 const s=core.exampleState(); s.profile.consent=true; core.activate(s,true); core.revoke(s); core.activate(s,false); assert.equal(s.sos.profile,null); assert.equal(s.profile.consent,false); assert(core.validateState(s));
});
test('Acuse idempotente, atención separada y SOS repetido no borra acuse', () => {
 const s=core.exampleState(); core.activate(s,false); assert(core.confirmReceipt(s.sos)); const receipt=JSON.stringify(s.sos.receipt);
 assert.equal(core.confirmReceipt(s.sos),false); assert.equal(core.activate(s,false),false); assert.equal(JSON.stringify(s.sos.receipt),receipt); assert.equal(s.sos.care,'pending'); assert(core.validateState(s));
});
test('No confirmar una emisión fallida', () => { const s=core.freshState(); core.activate(s,true); assert.equal(core.confirmReceipt(s.sos),false); });
test('Guardar un perfil sin consentimiento elimina perfil del SOS activo', () => {
 const s=core.exampleState(); s.profile.consent=true; core.activate(s,false); const p=structuredClone(s.profile); p.consent=false; core.saveProfile(s,p); assert.equal(s.sos.profile,null); assert(core.validateState(s));
});
test('Coordenadas reales, norte arriba y ausencia de punto sin GPS', () => {
 const s=core.exampleState(); const map=core.coordinates(s.examples); assert.equal(map.markers.length,2); assert(map.markers[0].y>map.markers[1].y); assert(map.markers[0].x>map.markers[1].x);
 assert.deepEqual(core.coordinates([]),{markers:[],bounds:null});
});
test('Coordenadas coincidentes agrupadas', () => {
 const s=core.exampleState(); s.examples[2].location=structuredClone(s.examples[0].location); assert.equal(core.coordinates(s.examples).markers[0].items.length,2);
});
test('Perfil vacío, edad fraccionaria e instrucciones extensas rechazados', () => {
 const p=core.exampleState().profile; for(const delta of [{name:''},{age:1.5},{instructions:'a'.repeat(201)},{conditions:[],otherCondition:'',noConditions:false},{allergies:'',noAllergies:false}]) assert.equal(core.validProfile({...p,...delta}),false);
 assert(core.validProfile({...p,age:0,noAllergies:true,allergies:'',noConditions:true,conditions:[],otherCondition:'',noInstructions:true,instructions:''}));
});
console.log(`TOTAL: ${passed} pruebas aprobadas`);
