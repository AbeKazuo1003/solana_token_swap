import type { NextPage } from 'next'
import { ReactNode, useEffect } from 'react'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { useRouter } from 'next/router'
import Button from '@/components/Button'

function HomePageContainer({ children }: { children?: ReactNode }) {
  useDocumentScrollDetector()
  return (
    <div
      className="flow-root overflow-x-hidden"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#141041',
        backgroundImage: "url('/backgroundImages/home-page-bg-lights.webp')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {children}
    </div>
  )
}

/**
 * auto-add --is-scrolling, which will be used by frosted-glass
 */
export function useDocumentScrollDetector() {
  useEffect(() => {
    if (!('document' in globalThis)) return
    let timeoutId
    document.addEventListener(
      'scroll',
      () => {
        globalThis.document.body.style.setProperty('--is-scrolling', '1')
        globalThis.clearTimeout(timeoutId)
        timeoutId = globalThis.setTimeout(() => {
          globalThis.document.body.style.setProperty('--is-scrolling', '0')
        }, 500)
      },
      { passive: true }
    )
  }, [])
}

const Home: NextPage = () => {
  const isMobile = useAppSettings((s) => s.isMobile)
  const { push } = useRouter()
  return (
    <HomePageContainer>
      <section className="grid-child-center grid-cover-container relative w-full h-full">
        <div className="grid-cover-content children-center">
          {!isMobile && (
            <Button
              className="frosted-glass-teal"
              onClick={() => {
                push('/swap')
              }}
            >
              Launch app
            </Button>
          )}
        </div>
      </section>
    </HomePageContainer>
  )
}

export default Home
