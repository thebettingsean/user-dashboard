"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import "./TargetCursor.css"

type TargetCursorProps = {
  targetSelector?: string
  spinDuration?: number
  hideDefaultCursor?: boolean
  hoverDuration?: number
  parallaxOn?: boolean
}

const defaultSelector = ".cursor-target"

const TargetCursor = ({
  targetSelector = defaultSelector,
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true
}: TargetCursorProps) => {
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const spinTl = useRef<gsap.core.Timeline | null>(null)
  const activeTargetRef = useRef<HTMLElement | null>(null)
  const currentLeaveHandlerRef = useRef<(() => void) | null>(null)
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const targetCornerPositionsRef = useRef<Array<{ x: number; y: number }> | null>(null)
  const tickerFnRef = useRef<(() => void) | null>(null)
  const activeStrengthRef = useRef({ current: 0 })
  const [canRender, setCanRender] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth <= 768
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase())

    setIsMobile((hasTouchScreen && isSmallScreen) || isMobileUserAgent)
    setCanRender(true)
  }, [])

  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return

    gsap.to(cursorRef.current, {
      x,
      y,
      duration: 0.1,
      ease: "power3.out"
    })
  }, [])

  useEffect(() => {
    if (!canRender || isMobile) return
    if (!cursorRef.current) return

    const cursor = cursorRef.current
    const originalCursor = document.body.style.cursor

    if (hideDefaultCursor) {
      document.body.style.cursor = "none"
    }

    cornersRef.current = cursor.querySelectorAll<HTMLDivElement>(".target-cursor-corner")
    const corners = cornersRef.current ? Array.from(cornersRef.current) : []

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    })

    const createSpinTimeline = () => {
      spinTl.current?.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: "+=360", duration: spinDuration, ease: "none" })
    }

    createSpinTimeline()

    const tickerFn = () => {
      if (!cursorRef.current || !cornersRef.current || !targetCornerPositionsRef.current) return
      const strength = activeStrengthRef.current.current
      if (strength === 0) return

      const cursorX = Number(gsap.getProperty(cursorRef.current, "x"))
      const cursorY = Number(gsap.getProperty(cursorRef.current, "y"))

      Array.from(cornersRef.current).forEach((corner, index) => {
        const currentX = Number(gsap.getProperty(corner, "x"))
        const currentY = Number(gsap.getProperty(corner, "y"))
        const target = targetCornerPositionsRef.current![index]
        const targetX = target.x - cursorX
        const targetY = target.y - cursorY
        const finalX = currentX + (targetX - currentX) * strength
        const finalY = currentY + (targetY - currentY) * strength
        const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration,
          ease: duration === 0 ? "none" : "power1.out",
          overwrite: "auto"
        })
      })
    }

    tickerFnRef.current = tickerFn

    const moveHandler = (e: MouseEvent) => moveCursor(e.clientX, e.clientY)
    const mouseDownHandler = () => {
      if (!dotRef.current || !cursorRef.current) return
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 })
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 })
    }
    const mouseUpHandler = () => {
      if (!dotRef.current || !cursorRef.current) return
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 })
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 })
    }

    window.addEventListener("mousemove", moveHandler)
    window.addEventListener("mousedown", mouseDownHandler)
    window.addEventListener("mouseup", mouseUpHandler)

    const cleanupTarget = (target?: HTMLElement | null) => {
      if (target && currentLeaveHandlerRef.current) {
        target.removeEventListener("mouseleave", currentLeaveHandlerRef.current)
      }
      currentLeaveHandlerRef.current = null
    }

    const resetCorners = () => {
      const cornerSize = 12
      corners.forEach((corner, index) => {
        const positions = [
          { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: cornerSize * 0.5 },
          { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
        ]
        gsap.to(corner, {
          x: positions[index].x,
          y: positions[index].y,
          duration: 0.3,
          ease: "power3.out"
        })
      })
    }

    const leaveHandlerFactory = (target: HTMLElement) => () => {
      gsap.ticker.remove(tickerFn)
      activeStrengthRef.current.current = 0
      targetCornerPositionsRef.current = null
      activeTargetRef.current = null

      resetCorners()

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
      }

      resumeTimeoutRef.current = setTimeout(() => {
        if (!activeTargetRef.current && cursorRef.current) {
          const normalizedRotation = Number(gsap.getProperty(cursorRef.current, "rotation")) % 360
          spinTl.current?.kill()
          spinTl.current = gsap
            .timeline({ repeat: -1 })
            .to(cursorRef.current, { rotation: "+=360", duration: spinDuration, ease: "none" })

          gsap.to(cursorRef.current, {
            rotation: normalizedRotation + 360,
            duration: spinDuration * (1 - normalizedRotation / 360),
            ease: "none",
            onComplete: () => {
              spinTl.current?.restart()
            }
          })
        }
      }, 50)

      cleanupTarget(target)
    }

    const enterHandler = (event: MouseEvent) => {
      const directTarget = event.target as HTMLElement | null
      if (!directTarget) return

      const matchedTarget = directTarget.closest(targetSelector) as HTMLElement | null
      if (!matchedTarget || !cursorRef.current || !cornersRef.current) return
      if (activeTargetRef.current === matchedTarget) return

      cleanupTarget(activeTargetRef.current)

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = null
      }

      activeTargetRef.current = matchedTarget

      const cursorEl = cursorRef.current
      const { borderWidth, cornerSize } = { borderWidth: 3, cornerSize: 12 }
      const rect = matchedTarget.getBoundingClientRect()
      const cursorX = Number(gsap.getProperty(cursorEl, "x"))
      const cursorY = Number(gsap.getProperty(cursorEl, "y"))

      targetCornerPositionsRef.current = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ]

      spinTl.current?.pause()
      gsap.set(cursorEl, { rotation: 0 })

      activeStrengthRef.current.current = 0
      gsap.to(activeStrengthRef.current, {
        current: 1,
        duration: hoverDuration,
        ease: "power2.out"
      })

      gsap.ticker.add(tickerFn)

      Array.from(cornersRef.current).forEach((corner, index) => {
        const target = targetCornerPositionsRef.current![index]
        gsap.to(corner, {
          x: target.x - cursorX,
          y: target.y - cursorY,
          duration: 0.2,
          ease: "power2.out"
        })
      })

      const leaveHandler = leaveHandlerFactory(matchedTarget)
      currentLeaveHandlerRef.current = leaveHandler
      matchedTarget.addEventListener("mouseleave", leaveHandler)
    }

    window.addEventListener("mouseover", enterHandler as EventListener)

    return () => {
      document.body.style.cursor = originalCursor
      window.removeEventListener("mousemove", moveHandler)
      window.removeEventListener("mousedown", mouseDownHandler)
      window.removeEventListener("mouseup", mouseUpHandler)
      window.removeEventListener("mouseover", enterHandler as EventListener)
      cleanupTarget(activeTargetRef.current)
      spinTl.current?.kill()
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current)
      activeTargetRef.current = null
      targetCornerPositionsRef.current = null
    }
  }, [canRender, hideDefaultCursor, hoverDuration, isMobile, moveCursor, parallaxOn, spinDuration, targetSelector])

  if (!canRender || isMobile) {
    return null
  }

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  )
}

export default TargetCursor

