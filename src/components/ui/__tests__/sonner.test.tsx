import { render, screen, fireEvent } from '@testing-library/react'
import { toast } from 'sonner'

// Mock sonner toast function
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    promise: jest.fn(),
    dismiss: jest.fn(),
    message: jest.fn()
  }
}))

describe('Toast/Sonner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls toast.success with correct parameters', () => {
    const TestComponent = () => {
      const handleSuccess = () => {
        toast.success('Success message', {
          description: 'Success description',
          duration: 4000
        })
      }
      return <button onClick={handleSuccess}>Show Success</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Success')
    fireEvent.click(button)
    
    expect(toast.success).toHaveBeenCalledWith('Success message', {
      description: 'Success description',
      duration: 4000
    })
  })

  it('calls toast.error with correct parameters', () => {
    const TestComponent = () => {
      const handleError = () => {
        toast.error('Error message', {
          description: 'Error description',
          duration: 5000
        })
      }
      return <button onClick={handleError}>Show Error</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Error')
    fireEvent.click(button)
    
    expect(toast.error).toHaveBeenCalledWith('Error message', {
      description: 'Error description',
      duration: 5000
    })
  })

  it('calls toast.warning with correct parameters', () => {
    const TestComponent = () => {
      const handleWarning = () => {
        toast.warning('Warning message', {
          description: 'Warning description',
          duration: 4000
        })
      }
      return <button onClick={handleWarning}>Show Warning</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Warning')
    fireEvent.click(button)
    
    expect(toast.warning).toHaveBeenCalledWith('Warning message', {
      description: 'Warning description',
      duration: 4000
    })
  })

  it('calls toast.info with correct parameters', () => {
    const TestComponent = () => {
      const handleInfo = () => {
        toast.info('Info message', {
          description: 'Info description',
          duration: 4000
        })
      }
      return <button onClick={handleInfo}>Show Info</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Info')
    fireEvent.click(button)
    
    expect(toast.info).toHaveBeenCalledWith('Info message', {
      description: 'Info description',
      duration: 4000
    })
  })

  it('calls toast.loading with correct parameters', () => {
    const TestComponent = () => {
      const handleLoading = () => {
        toast.loading('Loading message', {
          description: 'Loading description',
          duration: 3000
        })
      }
      return <button onClick={handleLoading}>Show Loading</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Loading')
    fireEvent.click(button)
    
    expect(toast.loading).toHaveBeenCalledWith('Loading message', {
      description: 'Loading description',
      duration: 3000
    })
  })

  it('calls toast with action and cancel buttons', () => {
    const TestComponent = () => {
      const handleToastWithActions = () => {
        toast('Message with actions', {
          description: 'This toast has action buttons',
          action: {
            label: 'Undo',
            onClick: () => toast.success('Action executed')
          },
          cancel: {
            label: 'Close',
            onClick: () => toast.info('Toast closed')
          },
          duration: 6000
        })
      }
      return <button onClick={handleToastWithActions}>Show Toast with Actions</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Toast with Actions')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Message with actions', {
      description: 'This toast has action buttons',
      action: {
        label: 'Undo',
        onClick: expect.any(Function)
      },
      cancel: {
        label: 'Close',
        onClick: expect.any(Function)
      },
      duration: 6000
    })
  })

  it('calls toast.promise with correct parameters', () => {
    const TestComponent = () => {
      const handlePromiseToast = () => {
        const promise = () => new Promise((resolve) => setTimeout(resolve, 2000))
        
        toast.promise(promise, {
          loading: 'Saving data...',
          success: 'Data saved successfully!',
          error: 'Error saving data.'
        })
      }
      return <button onClick={handlePromiseToast}>Show Promise Toast</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Promise Toast')
    fireEvent.click(button)
    
    expect(toast.promise).toHaveBeenCalledWith(expect.any(Function), {
      loading: 'Saving data...',
      success: 'Data saved successfully!',
      error: 'Error saving data.'
    })
  })

  it('calls toast with custom duration', () => {
    const TestComponent = () => {
      const handleCustomDuration = () => {
        toast('Custom duration toast', {
          duration: 10000
        })
      }
      return <button onClick={handleCustomDuration}>Show Custom Duration</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Custom Duration')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Custom duration toast', {
      duration: 10000
    })
  })

  it('calls toast with infinite duration', () => {
    const TestComponent = () => {
      const handleInfiniteDuration = () => {
        toast('Persistent toast', {
          duration: Infinity
        })
      }
      return <button onClick={handleInfiniteDuration}>Show Persistent Toast</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Persistent Toast')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Persistent toast', {
      duration: Infinity
    })
  })

  it('calls toast with custom position', () => {
    const TestComponent = () => {
      const handleCustomPosition = () => {
        toast('Positioned toast', {
          position: 'top-left'
        })
      }
      return <button onClick={handleCustomPosition}>Show Positioned Toast</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Positioned Toast')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Positioned toast', {
      position: 'top-left'
    })
  })

  it('calls toast with rich content', () => {
    const TestComponent = () => {
      const handleRichContent = () => {
        toast('Rich content toast', {
          description: (
            <div>
              <p>This toast has rich HTML content</p>
              <span className="badge">Tag</span>
            </div>
          ),
          duration: 5000
        })
      }
      return <button onClick={handleRichContent}>Show Rich Content</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Rich Content')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Rich content toast', {
      description: expect.any(Object),
      duration: 5000
    })
  })

  it('handles multiple toast calls', () => {
    const TestComponent = () => {
      const handleMultipleToasts = () => {
        toast.success('First toast')
        toast.info('Second toast')
        toast.warning('Third toast')
      }
      return <button onClick={handleMultipleToasts}>Show Multiple Toasts</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Multiple Toasts')
    fireEvent.click(button)
    
    expect(toast.success).toHaveBeenCalledWith('First toast')
    expect(toast.info).toHaveBeenCalledWith('Second toast')
    expect(toast.warning).toHaveBeenCalledWith('Third toast')
  })

  it('calls toast.dismiss', () => {
    const TestComponent = () => {
      const handleDismiss = () => {
        toast.dismiss()
      }
      return <button onClick={handleDismiss}>Dismiss All</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Dismiss All')
    fireEvent.click(button)
    
    expect(toast.dismiss).toHaveBeenCalled()
  })

  it('handles toast without description', () => {
    const TestComponent = () => {
      const handleSimpleToast = () => {
        toast.success('Simple success message')
      }
      return <button onClick={handleSimpleToast}>Show Simple Toast</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Simple Toast')
    fireEvent.click(button)
    
    expect(toast.success).toHaveBeenCalledWith('Simple success message')
  })

  it('handles toast with default options', () => {
    const TestComponent = () => {
      const handleDefaultToast = () => {
        toast('Default toast message')
      }
      return <button onClick={handleDefaultToast}>Show Default Toast</button>
    }

    render(<TestComponent />)
    
    const button = screen.getByText('Show Default Toast')
    fireEvent.click(button)
    
    expect(toast.message).toHaveBeenCalledWith('Default toast message')
  })
})
