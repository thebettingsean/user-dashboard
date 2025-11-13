'use client'

import { useLayoutEffect, useRef, useCallback } from 'react'
import Lenis from 'lenis'
import './ScrollStack.css'

export const ScrollStackItem = ({ children, itemClassName = '', icon, style }: { children: React.ReactNode; itemClassName?: string; icon?: React.ReactNode; style?: React.CSSProperties }) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()} style={style}>
    {icon && <div className="scroll-stack-card-icon">{icon}</div>}
    <div className="scroll-stack-card-content">{children}</div>
  </div>
)

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete
}: {
  children: React.ReactNode
  className?: string
  itemDistance?: number
  itemScale?: number
  itemStackDistance?: number
  stackPosition?: string
  scaleEndPosition?: string
  baseScale?: number
  scaleDuration?: number
  rotationAmount?: number
  blurAmount?: number
  useWindowScroll?: boolean
  onStackComplete?: () => void
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stackCompletedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const cardsRef = useRef<HTMLElement[]>([])
  const lastTransformsRef = useRef(new Map<number, { translateY: number; scale: number; rotation: number; blur: number }>())
  const rafUpdateRef = useRef<number | null>(null)
  const cardPositionsRef = useRef<Map<number, number>>(new Map())
  const lastScrollTopRef = useRef(0)
  const isMobileRef = useRef(false)
  const lastUpdateTimeRef = useRef(0)

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0
    if (scrollTop > end) return 1
    return (scrollTop - start) / (end - start)
  }, [])

  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight
    }
    return parseFloat(String(value))
  }, [])

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement
      }
    } else {
      const scroller = scrollerRef.current
      if (!scroller) return { scrollTop: 0, containerHeight: 0, scrollContainer: scroller }
      return {
        scrollTop: scroller.scrollTop,
        containerHeight: scroller.clientHeight,
        scrollContainer: scroller
      }
    }
  }, [useWindowScroll])

  const getElementOffset = useCallback(
    (element: HTMLElement, index: number) => {
      // Cache positions to avoid layout thrashing
      if (cardPositionsRef.current.has(index)) {
        return cardPositionsRef.current.get(index)!
      }
      
      let offset: number
      if (useWindowScroll) {
        const rect = element.getBoundingClientRect()
        offset = rect.top + window.scrollY
      } else {
        offset = element.offsetTop
      }
      
      cardPositionsRef.current.set(index, offset)
      return offset
    },
    [useWindowScroll]
  )

  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length) return

    const { scrollTop, containerHeight } = getScrollData()
    
    // Mobile-specific optimizations: more aggressive throttling
    const now = performance.now()
    const isMobile = isMobileRef.current
    const minUpdateInterval = isMobile ? 16 : 8 // ~60fps on mobile, ~120fps on desktop
    
    if (now - lastUpdateTimeRef.current < minUpdateInterval && rafUpdateRef.current) {
      return
    }
    
    // Skip if scroll hasn't changed significantly (reduces jitter)
    const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current)
    const minScrollDelta = isMobile ? 1.5 : 0.5
    if (scrollDelta < minScrollDelta && rafUpdateRef.current) {
      return
    }
    lastScrollTopRef.current = scrollTop
    lastUpdateTimeRef.current = now

    // Cancel any pending RAF update
    if (rafUpdateRef.current) {
      cancelAnimationFrame(rafUpdateRef.current)
    }

    // Schedule update in next frame for smooth rendering
    rafUpdateRef.current = requestAnimationFrame(() => {
      const stackPositionPx = parsePercentage(stackPosition, containerHeight)
      const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight)

      const endElement = useWindowScroll
        ? document.querySelector('.scroll-stack-end')
        : scrollerRef.current?.querySelector('.scroll-stack-end')

      let endElementTop = 0
      if (endElement) {
        if (useWindowScroll) {
          const rect = (endElement as HTMLElement).getBoundingClientRect()
          endElementTop = rect.top + window.scrollY
        } else {
          endElementTop = (endElement as HTMLElement).offsetTop
        }
      }

      cardsRef.current.forEach((card, i) => {
        if (!card) return

        const cardTop = getElementOffset(card, i)

        const triggerStart = cardTop - stackPositionPx - itemStackDistance * i
        const triggerEnd = cardTop - scaleEndPositionPx

        const pinStart = cardTop - stackPositionPx - itemStackDistance * i
        const pinEnd = endElementTop - containerHeight / 2

        const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd)

        const targetScale = baseScale + i * itemScale

        const scale = 1 - scaleProgress * (1 - targetScale)

        const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0

        let blur = 0

        if (blurAmount) {
          let topCardIndex = 0

          for (let j = 0; j < cardsRef.current.length; j++) {
            const jCardTop = getElementOffset(cardsRef.current[j], j)
            const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j

            if (scrollTop >= jTriggerStart) {
              topCardIndex = j
            }
          }

          if (i < topCardIndex) {
            const depthInStack = topCardIndex - i
            blur = Math.max(0, depthInStack * blurAmount)
          }
        }

        let translateY = 0

        const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd

        if (isPinned) {
          translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i
        } else if (scrollTop > pinEnd) {
          translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i
        }

        // Use more precise rounding to reduce sub-pixel jitter
        const newTransform = {
          translateY: Math.round(translateY * 10) / 10,
          scale: Math.round(scale * 10000) / 10000,
          rotation: Math.round(rotation * 10) / 10,
          blur: Math.round(blur * 10) / 10
        }

        const lastTransform = lastTransformsRef.current.get(i)

        // Mobile: looser thresholds to reduce update frequency, Desktop: tighter for smoothness
        const translateThreshold = isMobile ? 0.2 : 0.05
        const scaleThreshold = isMobile ? 0.001 : 0.0001
        const rotationThreshold = isMobile ? 0.15 : 0.05
        const blurThreshold = isMobile ? 0.15 : 0.05
        
        const hasChanged =
          !lastTransform ||
          Math.abs(lastTransform.translateY - newTransform.translateY) > translateThreshold ||
          Math.abs(lastTransform.scale - newTransform.scale) > scaleThreshold ||
          Math.abs(lastTransform.rotation - newTransform.rotation) > rotationThreshold ||
          Math.abs(lastTransform.blur - newTransform.blur) > blurThreshold

        if (hasChanged) {
          // Use will-change only when actively animating
          if (!card.style.willChange || card.style.willChange === 'auto') {
            card.style.willChange = 'transform, filter'
          }
          
          const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`
          const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : ''

          card.style.transform = transform
          if (filter) {
            card.style.filter = filter
          } else if (card.style.filter) {
            card.style.filter = ''
          }

          lastTransformsRef.current.set(i, newTransform)
        }

        if (i === cardsRef.current.length - 1) {
          const isInView = scrollTop >= pinStart && scrollTop <= pinEnd

          if (isInView && !stackCompletedRef.current) {
            stackCompletedRef.current = true
            onStackComplete?.()
          } else if (!isInView && stackCompletedRef.current) {
            stackCompletedRef.current = false
          }
        }
      })

      rafUpdateRef.current = null
    })
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData,
    getElementOffset
  ])

  const handleScroll = useCallback((e: any) => {
    // Use Lenis scroll position if available for smoother updates
    updateCardTransforms()
  }, [updateCardTransforms])

  const setupLenis = useCallback(() => {
    // Detect mobile
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      isMobileRef.current = hasTouchScreen && isSmallScreen
    }
    checkMobile()
    
    if (useWindowScroll) {
      const isMobile = isMobileRef.current
      const lenis = new Lenis({
        duration: isMobile ? 0.8 : 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: !isMobile, // Disable smooth wheel on mobile for native scrolling
        touchMultiplier: isMobile ? 1.0 : 1.2,
        infinite: false,
        wheelMultiplier: 1,
        lerp: isMobile ? 0.15 : 0.08, // More aggressive lerp on mobile for faster response
        syncTouch: true,
        syncTouchLerp: isMobile ? 0.3 : 0.2 // Higher sync on mobile for better touch response
      })

      lenis.on('scroll', handleScroll)

      const raf = (time: number) => {
        lenis.raf(time)
        animationFrameRef.current = requestAnimationFrame(raf)
      }

      animationFrameRef.current = requestAnimationFrame(raf)

      lenisRef.current = lenis

      return lenis
    } else {
      const scroller = scrollerRef.current
      if (!scroller) return

      const isMobile = isMobileRef.current
      const lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector('.scroll-stack-inner') as HTMLElement,
        duration: isMobile ? 0.8 : 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: !isMobile,
        touchMultiplier: isMobile ? 1.0 : 1.2,
        infinite: false,
        gestureOrientation: 'vertical',
        wheelMultiplier: 1,
        lerp: isMobile ? 0.15 : 0.08,
        syncTouch: true,
        syncTouchLerp: isMobile ? 0.3 : 0.2
      } as any)

      lenis.on('scroll', handleScroll)

      const raf = (time: number) => {
        lenis.raf(time)
        animationFrameRef.current = requestAnimationFrame(raf)
      }

      animationFrameRef.current = requestAnimationFrame(raf)

      lenisRef.current = lenis

      return lenis
    }
  }, [handleScroll, useWindowScroll])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll<HTMLElement>('.scroll-stack-card')
        : scroller.querySelectorAll<HTMLElement>('.scroll-stack-card')
    )

    cardsRef.current = cards

    const transformsCache = lastTransformsRef.current

    // Clear position cache when cards change
    cardPositionsRef.current.clear()
    
    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`
      }

      card.style.transformOrigin = 'top center'
      card.style.backfaceVisibility = 'hidden'
      card.style.transform = 'translate3d(0, 0, 0)'
      card.style.webkitTransform = 'translate3d(0, 0, 0)'
      // Don't set will-change initially - only when animating
      card.style.willChange = 'auto'
    })
    
    // Recalculate positions after layout
    requestAnimationFrame(() => {
      cards.forEach((card, i) => {
        if (card) {
          getElementOffset(card, i)
        }
      })
    })

    setupLenis()
    updateCardTransforms()

    // Invalidate position cache on resize
    const handleResize = () => {
      cardPositionsRef.current.clear()
      requestAnimationFrame(() => {
        cards.forEach((card, i) => {
          if (card) {
            getElementOffset(card, i)
          }
        })
        updateCardTransforms()
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })

      return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (rafUpdateRef.current) {
        cancelAnimationFrame(rafUpdateRef.current)
      }
      if (lenisRef.current) {
        lenisRef.current.destroy()
      }
      stackCompletedRef.current = false
      cardsRef.current = []
      transformsCache.clear()
      cardPositionsRef.current.clear()
      lastScrollTopRef.current = 0
      lastUpdateTimeRef.current = 0
    }
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    setupLenis,
    updateCardTransforms
  ])

  return (
    <div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" />
      </div>
    </div>
  )
}

export default ScrollStack

