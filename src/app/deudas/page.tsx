"use client";

import { type FormEvent, useState } from "react";

import { Pagina } from "@/components/navegacion";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Aviso, Boton, Campo, Encabezado, Entrada, EntradaPesos, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { describirMeses, formatoPesos, liquidarDeuda, proximoPago } from "@/lib/calculos";
import { pagarDeuda } from "@/lib/datos";
import { aNumero, type Deuda } from "@/lib/tipos";

export default function PaginaDeudas() {
  return (
    <ConSesion>
      <Deudas />
    </ConSesion>
  );
}

const TIPOS = { tarjeta: "Tarjeta de crédito", prestamo: "Préstamo", otro: "Otra deuda" } as const;

function normalizarDeuda(d: Deuda): Deuda {
  return {
    ...d,
    saldo: aNumero(d.saldo),
    tasa_anual: aNumero(d.tasa_anual),
    pago_mensual: aNumero(d.pago_mensual),
  };
}

function Deudas() {
  const deudas = useConsulta<Deuda[]>((sb) => sb.from("deudas").select("*").order("tasa_anual", { ascending: false }), []);
  const lista = (deudas.datos ?? []).map(normalizarDeuda);
  const total = lista.reduce((s, d) => s + d.saldo, 0);
  const interesMes = lista.reduce((s, d) => s + d.saldo * (d.tasa_anual / 100 / 12) * (d.iva_intereses ? 1.16 : 1), 0);

  return (
    <Pagina>
      <Encabezado descripcion="Ordenadas de la tasa más alta a la más baja: conviene pagar primero la de arriba." titulo="Deudas y tarjetas" />
      {lista.length > 0 ? (
        <section className="grid grid-cols-2 gap-3">
          <Tarjeta>
            <p className="text-sm text-tinta-2">Debes en total</p>
            <p className="cifra font-semibold text-2xl">{formatoPesos(total)}</p>
          </Tarjeta>
          <Tarjeta>
            <p className="text-sm text-tinta-2">Intereses de este mes</p>
            <p className="cifra font-semibold text-2xl text-mal">{formatoPesos(interesMes)}</p>
          </Tarjeta>
        </section>
      ) : null}
      {deudas.error ? <Aviso tono="mal">No se pudieron cargar: {deudas.error}</Aviso> : null}
      {deudas.datos && lista.length === 0 ? <Vacio>No tienes deudas registradas. 🎉</Vacio> : null}
      {lista.map((d) => (
        <TarjetaDeuda deuda={d} key={d.id} onCambio={deudas.recargar} />
      ))}
      <NuevaDeuda onCreada={deudas.recargar} />
    </Pagina>
  );
}

function TarjetaDeuda({ deuda, onCambio }: { deuda: Deuda; onCambio: () => void }) {
  const { sb } = useSesion();
  const [pago, setPago] = useState("");
  const [error, setError] = useState("");
  const resultado = liquidarDeuda(deuda.saldo, deuda.tasa_anual, deuda.pago_mensual, deuda.iva_intereses);
  const siguiente = deuda.dia_pago ? proximoPago(deuda.dia_pago) : null;

  const registrarPago = async () => {
    const valor = Number(pago);
    if (!(valor > 0)) {
      setError("Escribe cuánto pagaste.");
      return;
    }
    setError("");
    try {
      await pagarDeuda(sb, deuda, Math.round(valor * 100) / 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
      return;
    }
    setPago("");
    onCambio();
  };

  const actualizarSaldo = async () => {
    const texto = window.prompt("Saldo actual (como aparece en tu estado de cuenta):", String(deuda.saldo));
    if (texto === null) {
      return;
    }
    const valor = Number(texto);
    if (!(valor >= 0)) {
      setError("El saldo debe ser un número.");
      return;
    }
    await sb.from("deudas").update({ saldo: valor }).eq("id", deuda.id);
    onCambio();
  };

  const borrar = async () => {
    if (window.confirm(`¿Borrar "${deuda.nombre}"?`)) {
      await sb.from("deudas").delete().eq("id", deuda.id);
      onCambio();
    }
  };

  return (
    <Tarjeta className="space-y-3">
      <Titulo accion={<Boton aria-label={`Borrar ${deuda.nombre}`} className="px-2" onClick={() => void borrar()} variante="peligro">✕</Boton>}>
        {deuda.nombre} <span className="font-normal text-sm text-tinta-3">· {TIPOS[deuda.tipo]}</span>
      </Titulo>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Dato texto="Saldo" valor={formatoPesos(deuda.saldo)} />
        <Dato texto="Interés anual" valor={`${deuda.tasa_anual} %${deuda.iva_intereses ? " + IVA" : ""}`} />
        <Dato texto="Pagas al mes" valor={formatoPesos(deuda.pago_mensual)} />
        <Dato
          texto="Próximo pago"
          valor={
            siguiente
              ? siguiente.dias === 0
                ? "Hoy"
                : `${siguiente.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} (${siguiente.dias} d)`
              : "—"
          }
        />
      </div>
      {resultado.estado === "pagada" ? (
        <Aviso tono="bien">✓ Esta deuda ya está pagada. Puedes borrarla.</Aviso>
      ) : resultado.estado === "nunca" ? (
        <Aviso tono="mal">
          ⚠ Con {formatoPesos(deuda.pago_mensual)} al mes solo cubres intereses (
          {formatoPesos(resultado.interesMensual)} este mes): la deuda no baja. Sube tu pago mensual.
        </Aviso>
      ) : (
        <p className="text-sm text-tinta-2">
          Este mes te cobran <span className="cifra font-medium text-tinta">{formatoPesos(resultado.interesMensual)}</span> de
          intereses. Pagando {formatoPesos(deuda.pago_mensual)} al mes terminas en{" "}
          <span className="font-medium text-tinta">{describirMeses(resultado.meses)}</span> y pagas{" "}
          <span className="cifra font-medium text-tinta">{formatoPesos(resultado.interesTotal)}</span> de intereses en total.
        </p>
      )}
      {deuda.saldo > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-32 flex-1">
            <EntradaPesos aria-label={`Pago a ${deuda.nombre}`} onChange={(e) => setPago(e.currentTarget.value)} placeholder="Cuánto pagaste" value={pago} />
          </div>
          <Boton onClick={() => void registrarPago()}>Registrar pago</Boton>
          <Boton onClick={() => void actualizarSaldo()} variante="secundario">
            Corregir saldo
          </Boton>
        </div>
      ) : null}
      {error ? <Aviso tono="mal">{error}</Aviso> : null}
    </Tarjeta>
  );
}

function Dato({ texto, valor }: { texto: string; valor: string }) {
  return (
    <div>
      <p className="text-tinta-3 text-xs">{texto}</p>
      <p className="cifra font-medium">{valor}</p>
    </div>
  );
}

function NuevaDeuda({ onCreada }: { onCreada: () => void }) {
  const { sb } = useSesion();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Deuda["tipo"]>("tarjeta");
  const [saldo, setSaldo] = useState("");
  const [tasa, setTasa] = useState("");
  const [pago, setPago] = useState("");
  const [dia, setDia] = useState("");
  const [iva, setIva] = useState(true);
  const [error, setError] = useState("");

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    const diaPago = dia ? Number(dia) : null;
    if (diaPago !== null && !(diaPago >= 1 && diaPago <= 31)) {
      setError("El día de pago va del 1 al 31.");
      return;
    }
    const { error } = await sb.from("deudas").insert({
      nombre: nombre.trim(),
      tipo,
      saldo: Number(saldo) || 0,
      tasa_anual: Number(tasa) || 0,
      pago_mensual: Number(pago) || 0,
      dia_pago: diaPago,
      iva_intereses: iva,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setNombre("");
    setSaldo("");
    setTasa("");
    setPago("");
    setDia("");
    onCreada();
  };

  return (
    <Tarjeta>
      <Titulo>Agregar deuda</Titulo>
      <form className="space-y-4" onSubmit={crear}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" id="deuda-nombre">
            <Entrada id="deuda-nombre" maxLength={60} onChange={(e) => setNombre(e.currentTarget.value)} placeholder="Ej. Tarjeta BBVA" required value={nombre} />
          </Campo>
          <Campo etiqueta="Tipo" id="deuda-tipo">
            <Selector
              id="deuda-tipo"
              onChange={(e) => {
                const nuevo = e.currentTarget.value as Deuda["tipo"];
                setTipo(nuevo);
                setIva(nuevo === "tarjeta");
              }}
              value={tipo}
            >
              {Object.entries(TIPOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Saldo que debes" id="deuda-saldo">
            <EntradaPesos id="deuda-saldo" onChange={(e) => setSaldo(e.currentTarget.value)} required value={saldo} />
          </Campo>
          <Campo ayuda="Viene en tu estado de cuenta como “tasa de interés anual”, no el CAT." etiqueta="Interés anual (%)" id="deuda-tasa">
            <Entrada className="cifra" id="deuda-tasa" inputMode="decimal" max="300" min="0" onChange={(e) => setTasa(e.currentTarget.value)} step="0.01" type="number" value={tasa} />
          </Campo>
          <Campo etiqueta="¿Cuánto pagas al mes?" id="deuda-pago">
            <EntradaPesos id="deuda-pago" onChange={(e) => setPago(e.currentTarget.value)} value={pago} />
          </Campo>
          <Campo etiqueta="Día de pago (opcional)" id="deuda-dia">
            <Entrada className="cifra" id="deuda-dia" inputMode="numeric" max="31" min="1" onChange={(e) => setDia(e.currentTarget.value)} placeholder="Ej. 15" type="number" value={dia} />
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input checked={iva} className="size-4" onChange={(e) => setIva(e.currentTarget.checked)} type="checkbox" />
            Me cobran IVA (16 %) sobre los intereses (normal en tarjetas en México)
          </label>
        </div>
        {error ? <Aviso tono="mal">{error}</Aviso> : null}
        <Boton type="submit">Agregar deuda</Boton>
      </form>
    </Tarjeta>
  );
}
