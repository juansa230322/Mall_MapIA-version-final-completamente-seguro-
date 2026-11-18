import json
N=[];E=[]
def n(id,piso,x,y,tipo,nombre=None):
    N.append(dict(id=id,piso=piso,x=x,y=y,tipo=tipo,nombre=nombre or id))
def e(a,b,tipo="pasillo"): E.append([a,b,tipo])
# ---------- PISO 1 (Piso 1.svg, viewBox 0 0 1388 731) ----------
c1={"C01":(724.531,400.5),"C02":(727.531,476.5),"C03":(727.531,527.5),"C04":(673.531,413.5),"C05":(682.531,443.5),
"C06":(642.531,444.5),"C07":(614.531,472.5),"C08":(588.531,499.5),"C09":(560.531,527.5),"C10":(582.531,556.5),
"C11":(766.531,440.5),"C12":(801.531,444.5),"C13":(825.531,468.5),"C14":(851.531,494.5),"C15":(875.531,518.5),
"C16":(878.531,542.5),"C17":(865.531,556.5),"C18":(643.531,382.5),"C19":(797.531,390.5)}
REF1={"C01":"Plazoleta norte (frente a escaleras)","C02":"Plazoleta central","C18":"Pasillo noroeste (punto de referencia)"}
for k,(x,y) in c1.items(): n("P1-"+k,1,x,y,"pasillo",REF1.get(k,"Pasillo "+k))
n("P1-E01",1,713.531,549.5,"entrada","Entrada sur (oeste)")
n("P1-E02",1,741.531,549.5,"entrada","Entrada sur (este)")
n("P1-ASC",1,727.531,548.5,"ascensor","Ascensor central sur")
n("P1-ESC",1,727.531,424.5,"escalera","Escaleras centrales")
n("P1-B01",1,558.531,538.5,"bano","Baños sector oeste")
n("P1-B02",1,887.531,542.5,"bano","Baños sector este")
l1=[("L01",691.531,477.5,"C02"),("L02",664.531,450.5,"C05"),("L03",642.531,415.5,"C04"),("L04",709.531,539.5,"C03"),
("L05",744.531,539.5,"C03"),("L06",758.531,477.5,"C02"),("L07",782.531,452.5,"C11"),("L08",808.531,415.5,"C19"),
("L09",684.531,592.5,"E01"),("L10",766.531,592.5,"E02")]
for k,x,y,c in l1: n("P1-"+k,1,x,y,"local","Local "+k); e("P1-"+k,"P1-"+c)
for a,b in [("C18","C04"),("C04","C05"),("C05","C02"),("C05","C06"),("C06","C07"),("C07","C08"),("C08","C09"),("C09","C10"),
("C04","C01"),("C01","ESC"),("ESC","C02"),("C02","C03"),("C03","ASC"),("C03","E01"),("C03","E02"),("C01","C19"),("C19","C11"),
("C02","C11"),("C11","C12"),("C12","C13"),("C13","C14"),("C14","C15"),("C15","C16"),("C16","C17"),("C09","B01"),("C16","B02")]:
    e("P1-"+a,"P1-"+b)
# ---------- PISO 2 (Piso 2.svg, viewBox 0 0 1427 766) ----------
c2={"C01":(736,416.554),"C02":(713,428.554),"C03":(694,429.554),"C04":(763,434.554),"C05":(692,451.554),"C06":(671,468.554),
"C07":(682,479.554),"C08":(698,495.554),"C09":(717,510.554),"C10":(736,520.554),"C11":(755,508.554),"C12":(771,491.554),
"C13":(791,473.554),"C14":(781,451.554),"C15":(652,455.554),"C16":(638,508.554),"C17":(619,524.554),"C18":(812,488.554),
"C19":(840,517.554),"C20":(864,551.554),"C21":(581,529.554),"C22":(521,537.554),"C23":(509,551.554),"C24":(785,416.554),
"C25":(635,436.554),"C27":(656,491.554)}
REF2={"C10":"Hall sur del piso 2","C01":"Plazoleta norte del piso 2"}
for k,(x,y) in c2.items(): n("P2-"+k,2,x,y,"pasillo",REF2.get(k,"Pasillo "+k))
n("P2-ESC12",2,741,457.554,"escalera","Escaleras centrales (llegan del piso 1)")
n("P2-ESC23A",2,725,564.554,"escalera","Escalera sur oeste (hacia piso 3)")
n("P2-ESC23B",2,748,564.554,"escalera","Escalera sur este (hacia piso 3)")
n("P2-ASC",2,737,585.554,"ascensor","Ascensor central sur")
n("P2-B01",2,491,556.554,"bano","Baños sector oeste")
l2=[("L01",704,516.554,"C09"),("L02",716,530.554,"C10"),("L03",687,500.554,"C08"),("L04",752,528.554,"C11"),("L05",769,518.554,"C12"),
("L06",651,483.554,"C27"),("L07",623,510.554,"C17"),("L08",808,499.554,"C18"),("L09",822,484.554,"C18"),("L10",734,406.554,"C01"),("L11",842,535.554,"C19")]
for k,x,y,c in l2: n("P2-"+k,2,x,y,"local","Local "+k); e("P2-"+k,"P2-"+c)
for a,b in [("C01","C02"),("C02","C03"),("C03","C05"),("C05","C06"),("C06","C07"),("C07","C08"),("C08","C09"),("C09","C10"),
("C10","C11"),("C11","C12"),("C12","C13"),("C13","C14"),("C14","C04"),("C04","C01"),("C04","C24"),("ESC12","C02"),("ESC12","C04"),
("C06","C15"),("C15","C25"),("C15","C27"),("C27","C16"),("C16","C17"),("C17","C21"),("C21","C22"),("C22","C23"),("C23","B01"),
("C12","C18"),("C18","C19"),("C19","C20"),("C10","ESC23A"),("C10","ESC23B"),("C10","ASC")]:
    e("P2-"+a,"P2-"+b)
# ---------- PISO 3 (Piso 3.svg, viewBox 0 0 1303 745) ----------
c3={"C01":(648.5,585.5),"C02":(612.5,585.5),"C03":(583.5,587.5),"C04":(557.5,587.5),"C05":(530.5,579.5),"C06":(510.5,563.5),
"C07":(498.5,543.5),"C08":(490.5,527.5),"C09":(471.5,509.5),"C10":(461.5,487.5),"C11":(452.5,477.5),"C12":(689.5,585.5),
"C13":(712.5,585.5),"C14":(740.5,585.5),"C15":(764.5,577.5),"C16":(789.5,565.5),"C17":(799.5,545.5),"C18":(808.5,524.5),
"C19":(811.5,505.5),"C20":(815.5,483.5)}
REF3={"C01":"Hall del ascensor piso 3"}
for k,(x,y) in c3.items(): n("P3-"+k,3,x,y,"pasillo",REF3.get(k,"Pasillo "+k))
n("P3-ASC",3,648.5,563.5,"ascensor","Ascensor central sur")
n("P3-ESCA",3,635.5,570.5,"escalera","Escalera sur oeste")
n("P3-ESCB",3,659.5,570.5,"escalera","Escalera sur este")
n("P3-B01",3,457.5,459.5,"bano","Baños sector oeste")
l3=[("L01",608.5,564.5,"C02"),("L02",583.5,564.5,"C03"),("L03",553.5,561.5,"C04"),("L04",530.5,554.5,"C05"),("L05",515.5,542.5,"C06"),
("L06",501.5,528.5,"C07"),("L07",488.5,514.5,"C08"),("L08",689.5,564.5,"C12"),("L09",714.5,564.5,"C13"),("L10",750.5,561.5,"C14"),
("L11",768.5,551.5,"C15"),("L12",781.5,539.5,"C16"),("L13",795.5,526.5,"C18"),("L14",826.5,472.5,"C20")]
for k,x,y,c in l3: n("P3-"+k,3,x,y,"local","Local "+k); e("P3-"+k,"P3-"+c)
for a,b in [("C01","C02"),("C02","C03"),("C03","C04"),("C04","C05"),("C05","C06"),("C06","C07"),("C07","C08"),("C08","C09"),
("C09","C10"),("C10","C11"),("C11","B01"),("C01","C12"),("C12","C13"),("C13","C14"),("C14","C15"),("C15","C16"),("C16","C17"),
("C17","C18"),("C18","C19"),("C19","C20"),("C01","ASC"),("C01","ESCA"),("C01","ESCB")]:
    e("P3-"+a,"P3-"+b)
# ---------- Verticales (correspondencia SUPUESTA, datos de demostración) ----------
e("P1-ESC","P2-ESC12","escalera"); e("P1-ASC","P2-ASC","ascensor"); e("P2-ASC","P3-ASC","ascensor")
e("P2-ESC23A","P3-ESCA","escalera"); e("P2-ESC23B","P3-ESCB","escalera")
ids={x["id"] for x in N}
assert len(ids)==len(N)
for a,b,t in E: assert a in ids and b in ids,(a,b)
out={"_nota":"Grafo anotado a mano sobre las marcas de color de los SVG originales. Coordenadas en unidades del viewBox de cada piso. Las conexiones son inferidas por cercania y recorrido visual; las conexiones verticales entre pisos son una correspondencia SUPUESTA para demostracion. Los costos estan en unidades del plano, no en metros.",
"sector":{"nombre":"Eje central-sur (sector piloto)","bbox":{"1":[530,360,910,615],"2":[470,385,880,600],"3":[430,440,850,605]}},
"costosVerticales":{"ascensor":90,"escalera":40},
"nodos":N,"conexiones":[{"origen":a,"destino":b,"tipo":t,"bidireccional":True} for a,b,t in E]}
json.dump(out,open(__import__("os").path.join(__import__("os").path.dirname(__file__),"..","data","grafo-sector.json"),"w"),ensure_ascii=False,indent=1)
print(len(N),"nodos",len(E),"conexiones")
