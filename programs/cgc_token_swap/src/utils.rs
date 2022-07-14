use crate::constants::*;

pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > NAME_MAX_LEN {
        &b[0..NAME_MAX_LEN]
    } else {
        b
    }
}