import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const useSessionTracker = (user) => {
  const sessionIdRef = useRef(null)
  const sessionStartRef = useRef(null)

  const getDeviceInfo = () => {
    const ua = navigator.userAgent
    
    // Detectar tipo de dispositivo
    let deviceType = 'desktop'
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      deviceType = /iPad|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : 'mobile'
    }

    // Detectar navegador
    let browser = 'Unknown'
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox'
    else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung Internet'
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera'
    else if (ua.indexOf('Trident') > -1) browser = 'Internet Explorer'
    else if (ua.indexOf('Edge') > -1) browser = 'Edge'
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome'
    else if (ua.indexOf('Safari') > -1) browser = 'Safari'

    // Detectar sistema operacional
    let os = 'Unknown'
    if (ua.indexOf('Win') > -1) os = 'Windows'
    else if (ua.indexOf('Mac') > -1) os = 'MacOS'
    else if (ua.indexOf('Linux') > -1) os = 'Linux'
    else if (ua.indexOf('Android') > -1) os = 'Android'
    else if (ua.indexOf('like Mac') > -1) os = 'iOS'

    return { deviceType, browser, os, userAgent: ua }
  }

  const registrarAcesso = async () => {
    if (!user) return

    try {
      const deviceInfo = getDeviceInfo()
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          user_agent: deviceInfo.userAgent,
          accessed_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      sessionIdRef.current = data.id
      sessionStartRef.current = new Date()
      
      console.log('✅ Acesso registrado:', data.id)
    } catch (error) {
      console.error('Erro ao registrar acesso:', error)
    }
  }

  const finalizarSessao = async () => {
    if (!sessionIdRef.current || !sessionStartRef.current) return

    try {
      const sessionEnd = new Date()
      const duration = Math.floor((sessionEnd - sessionStartRef.current) / 1000) // segundos

      await supabase
        .from('user_sessions')
        .update({
          logout_at: sessionEnd.toISOString(),
          session_duration: duration
        })
        .eq('id', sessionIdRef.current)

      console.log('✅ Sessão finalizada:', sessionIdRef.current, `Duração: ${duration}s`)
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
    }
  }

  useEffect(() => {
    if (user) {
      registrarAcesso()

      // Finalizar sessão ao fechar/sair
      const handleBeforeUnload = () => {
        // Usar sendBeacon para garantir envio mesmo ao fechar
        if (sessionIdRef.current && sessionStartRef.current) {
          const duration = Math.floor((new Date() - sessionStartRef.current) / 1000)
          
          // Enviar via fetch com keepalive
          fetch(`${supabase.supabaseUrl}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabase.supabaseKey,
              'Authorization': `Bearer ${user.access_token}`
            },
            body: JSON.stringify({
              logout_at: new Date().toISOString(),
              session_duration: duration
            }),
            keepalive: true
          }).catch(() => {})
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        finalizarSessao()
      }
    }
  }, [user])

  return { registrarAcesso, finalizarSessao }
}
