"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

class ClickSpark {
  container: HTMLElement
  sparkColor: string
  sparkSize: number
  sparkRadius: number
  sparkCount: number
  duration: number
  easing: string
  extraScale: number
  sparks: Array<{
    x: number
    y: number
    angle: number
    startTime: number
  }>
  canvas: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D

  constructor(container: HTMLElement, options: Record<string, unknown> = {}) {
    this.container = container
    this.sparkColor = (options.sparkColor as string) || "#fff"
    this.sparkSize = (options.sparkSize as number) || 10
    this.sparkRadius = (options.sparkRadius as number) || 15
    this.sparkCount = (options.sparkCount as number) || 8
    this.duration = (options.duration as number) || 400
    this.easing = (options.easing as string) || "ease-out"
    this.extraScale = (options.extraScale as number) || 1.0

    this.sparks = []

    this.canvas = document.createElement("canvas")
    this.canvas.classList.add("click-spark-canvas")
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.zIndex = "9999"
    const ctx = this.canvas.getContext("2d")
    if (!ctx) return
    this.ctx = ctx

    const containerStyle = getComputedStyle(this.container)
    if (containerStyle.position === "static") {
      this.container.style.position = "relative"
    }

    this.container.appendChild(this.canvas)

    this.resizeCanvas()
    window.addEventListener("resize", () => this.resizeCanvas())

    this.container.addEventListener("click", (e) => {
      this.handleClick(e)
    })

    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)
  }

  resizeCanvas() {
    if (this.container === document.body) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.canvas.style.position = "fixed"
      this.canvas.style.top = "0"
      this.canvas.style.left = "0"
    } else {
      const rect = this.container.getBoundingClientRect()
      this.canvas.width = rect.width
      this.canvas.height = rect.height
      this.canvas.style.position = "absolute"
      this.canvas.style.top = "0"
      this.canvas.style.left = "0"
    }
  }

  easeFunc(t: number): number {
    switch (this.easing) {
      case "linear":
        return t
      case "ease-in":
        return t * t
      case "ease-in-out":
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      default:
        return t * (2 - t)
    }
  }

  handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const now = performance.now()

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparks.push({
        x,
        y,
        angle: (2 * Math.PI * i) / this.sparkCount,
        startTime: now,
      })
    }
  }

  animate(timestamp: number) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.sparks = this.sparks.filter((spark) => {
      const elapsed = timestamp - spark.startTime
      if (elapsed >= this.duration) return false

      const progress = elapsed / this.duration
      const eased = this.easeFunc(progress)
      const distance = eased * this.sparkRadius * this.extraScale
      const lineLength = this.sparkSize * (1 - eased)

      const x1 = spark.x + distance * Math.cos(spark.angle)
      const y1 = spark.y + distance * Math.sin(spark.angle)
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle)
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle)

      ctx.strokeStyle = this.sparkColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      return true
    })

    requestAnimationFrame(this.animate)
  }
}

export default function ClickSparkProvider() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const sparkColor = resolvedTheme === "dark" ? "#ffffff" : "#3b5bdb"
    
    new ClickSpark(document.body, {
      sparkColor,
      sparkSize: 6,
      sparkRadius: 20,
      sparkCount: 8,
      duration: 500,
    })
  }, [resolvedTheme, mounted])

  return null
}
