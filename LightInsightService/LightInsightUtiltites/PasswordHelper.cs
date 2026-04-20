using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightUtiltites
{
    public static class PasswordHelper
    {
        private const string SECRET_KEY = "LIGHTJSC_SECRET"; // đổi cái này

        public static string HashPassword(string username, string password)
        {
            var raw = $"{username}:{password}:{SECRET_KEY}";

            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(raw);
                var hash = sha256.ComputeHash(bytes);

                return Convert.ToBase64String(hash);
            }
        }
    }
}
