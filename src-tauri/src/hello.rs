//! Windows Hello (biometric/PIN) + DPAPI key protection.
//!
//! `hello_protect` wraps the app's master key with DPAPI (user-scoped) so it is
//! stored encrypted at rest. `hello_unprotect` requires a Windows Hello consent
//! prompt before DPAPI-decrypting and returning the key.

use base64::{engine::general_purpose::STANDARD, Engine};

#[tauri::command]
pub fn hello_available() -> bool {
    imp::available()
}

#[tauri::command]
pub fn hello_protect(key: String) -> Result<String, String> {
    let data = STANDARD.decode(key).map_err(|e| e.to_string())?;
    let out = imp::run(move || imp::protect(&data))?;
    Ok(STANDARD.encode(out))
}

#[tauri::command]
pub fn hello_unprotect(blob: String) -> Result<String, String> {
    let data = STANDARD.decode(blob).map_err(|e| e.to_string())?;
    let out = imp::run(move || imp::unprotect(&data))?;
    Ok(STANDARD.encode(out))
}

#[cfg(windows)]
mod imp {
    use windows::core::HSTRING;
    use windows::Security::Credentials::UI::{
        UserConsentVerificationResult, UserConsentVerifier, UserConsentVerifierAvailability,
    };
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED};

    /// Run a closure on a dedicated MTA thread (WinRT `.get()` must not block an STA/UI thread).
    pub fn run<T, F>(f: F) -> Result<T, String>
    where
        T: Send + 'static,
        F: FnOnce() -> Result<T, String> + Send + 'static,
    {
        std::thread::spawn(move || {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }
            let r = f();
            unsafe {
                CoUninitialize();
            }
            r
        })
        .join()
        .map_err(|_| "hello thread panicked".to_string())?
    }

    pub fn available() -> bool {
        run(|| {
            let a = UserConsentVerifier::CheckAvailabilityAsync()
                .map_err(|e| e.to_string())?
                .get()
                .map_err(|e| e.to_string())?;
            Ok(a == UserConsentVerifierAvailability::Available)
        })
        .unwrap_or(false)
    }

    fn verify() -> Result<(), String> {
        let msg = HSTRING::from("Unlock NoteX");
        let res = UserConsentVerifier::RequestVerificationAsync(&msg)
            .map_err(|e| e.to_string())?
            .get()
            .map_err(|e| e.to_string())?;
        if res == UserConsentVerificationResult::Verified {
            Ok(())
        } else {
            Err("Windows Hello verification was not completed.".to_string())
        }
    }

    pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
        verify()?;
        crypt(data, true)
    }

    pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
        verify()?;
        crypt(data, false)
    }

    fn crypt(data: &[u8], protect: bool) -> Result<Vec<u8>, String> {
        unsafe {
            let input = CRYPT_INTEGER_BLOB {
                cbData: data.len() as u32,
                pbData: data.as_ptr() as *mut u8,
            };
            let mut output = CRYPT_INTEGER_BLOB::default();
            let result = if protect {
                CryptProtectData(
                    &input,
                    None,
                    None,
                    None,
                    None,
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut output,
                )
            } else {
                CryptUnprotectData(
                    &input,
                    None,
                    None,
                    None,
                    None,
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut output,
                )
            };
            result.map_err(|e| e.to_string())?;
            let out = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            let _ = LocalFree(HLOCAL(output.pbData as *mut core::ffi::c_void));
            Ok(out)
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn run<T, F>(f: F) -> Result<T, String>
    where
        F: FnOnce() -> Result<T, String>,
    {
        f()
    }
    pub fn available() -> bool {
        false
    }
    pub fn protect(_data: &[u8]) -> Result<Vec<u8>, String> {
        Err("Windows Hello is only available on Windows.".to_string())
    }
    pub fn unprotect(_data: &[u8]) -> Result<Vec<u8>, String> {
        Err("Windows Hello is only available on Windows.".to_string())
    }
}
