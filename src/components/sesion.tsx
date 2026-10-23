"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useState } from "react";

import { registrarIngresosFijos } from "@/lib/datos";
import { supabase } from "@/lib/supabase";
import { CATEGORIAS_INICIALES } from "@/lib/tipos";

import { Aviso, Boton, Campo, Entrada, Tarjeta } from "./ui";

type Sesion = { usuario: User; sb: SupabaseClient };

const ContextoSesion = createContext<Sesion | null>(null);

export function useSesion() {
  const sesion = useContext(ContextoSesion);
  if (!sesion) {
    throw new Error("useSesion se usa dentro de <ConSesion>");
  }
  return sesion;
}

// La primera vez que alguien entra le creamos categorías comunes para que no empiece en blanco.
// En cada entrada se registran los sueldos que ya llegaron.
async function prepararCuenta(sb: SupabaseClient) {
  const { count, error } = await sb.from("categorias").select("id", { count: "exact", head: true });
  if (!error && count === 0) {
    await sb.from("categorias").insert(CATEGORIAS_INICIALES);
  }
  await registrarIngresosFijos(sb);
}

export function ConSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const sb = supabase;
    void sb.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await prepararCuenta(sb);
      }
      setUsuario(data.session?.user ?? null);
      setListo(true);
    });
    const { data } = sb.auth.onAuthStateChange((evento, sesion) => {
      if (evento === "SIGNED_IN") {
        void prepararCuenta(sb);
      }
      setUsuario(sesion?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return <FaltaConfiguracion />;
  }
  if (!listo) {
    return <p className="p-6 text-center text-tinta-2">Cargando…</p>;
  }
  if (!usuario) {
    return <Entrar sb={supabase} />;
  }
  return <ContextoSesion value={{ usuario, sb: supabase }}>{children}</ContextoSesion>;
}

function Entrar({ sb }: { sb: SupabaseClient }) {
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    setAviso("");
    if (modo === "entrar") {
      const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : error.message === "Email not confirmed"
              ? "Primero confirma tu correo con el enlace que te enviamos."
              : error.message,
        );
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email: correo,
        password: clave,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setAviso("Te enviamos un correo. Abre el enlace para confirmar tu cuenta y después entra aquí.");
        setModo("entrar");
      }
    }
    setEnviando(false);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div className="text-center">
        <h1 className="font-semibold text-2xl">Mis Finanzas</h1>
        <p className="text-sm text-tinta-2">
          {modo === "entrar" ? "Entra para ver tus cuentas." : "Crea tu cuenta para guardar tus datos."}
        </p>
      </div>
      <Tarjeta>
        <form className="space-y-4" onSubmit={enviar}>
          <Campo etiqueta="Correo" id="correo">
            <Entrada
              autoComplete="email"
              id="correo"
              onChange={(e) => setCorreo(e.currentTarget.value)}
              required
              type="email"
              value={correo}
            />
          </Campo>
          <Campo ayuda={modo === "crear" ? "Mínimo 6 caracteres." : undefined} etiqueta="Contraseña" id="clave">
            <Entrada
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              id="clave"
              minLength={6}
              onChange={(e) => setClave(e.currentTarget.value)}
              required
              type="password"
              value={clave}
            />
          </Campo>
          {error ? <Aviso tono="mal">{error}</Aviso> : null}
          {aviso ? <Aviso tono="bien">{aviso}</Aviso> : null}
          <Boton className="w-full" disabled={enviando} type="submit">
            {modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </Boton>
        </form>
      </Tarjeta>
      <Boton onClick={() => setModo(modo === "entrar" ? "crear" : "entrar")} variante="fantasma">
        {modo === "entrar" ? "¿No tienes cuenta? Créala" : "Ya tengo cuenta"}
      </Boton>
      <a className="text-center text-acento text-sm hover:underline" href="/calculadora">
        Usar la calculadora de ahorro sin cuenta
      </a>
    </main>
  );
}

function FaltaConfiguracion() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
      <h1 className="font-semibold text-2xl">Falta conectar la base de datos</h1>
      <Tarjeta className="space-y-2 text-sm">
        <p>
          Crea un archivo <code>.env.local</code> en la carpeta del proyecto con los datos de tu proyecto de Supabase
          (los encuentras en Project Settings → API):
        </p>
        <pre className="overflow-x-auto rounded-lg bg-fondo p-3 text-xs">
          {"NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_ANON_KEY=..."}
        </pre>
        <p>
          Después corre <code>supabase/schema.sql</code> en el SQL Editor de Supabase y reinicia el servidor.
        </p>
      </Tarjeta>
      <a className="text-acento text-sm hover:underline" href="/calculadora">
        Mientras tanto, la calculadora de ahorro ya funciona →
      </a>
    </main>
  );
}

// Carga datos con la sesión actual y permite recargarlos después de guardar.
export function useConsulta<T>(
  cargar: (sb: SupabaseClient) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  dependencias: unknown[],
) {
  const { sb } = useSesion();
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    void Promise.resolve(cargar(sb)).then(({ data, error }) => {
      if (cancelado) {
        return;
      }
      setError(error ? error.message : "");
      setDatos(data);
    });
    return () => {
      cancelado = true;
    };
    // Las dependencias las define quien llama: `cargar` es una función nueva en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, version, ...dependencias]);

  return { datos, error, recargar: () => setVersion((v) => v + 1) };
}
